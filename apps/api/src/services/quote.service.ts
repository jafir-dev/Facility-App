import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Quote } from '../entities/quote.entity';
import { QuoteItem } from '../entities/quote-item.entity';
import { Ticket } from '../entities/ticket.entity';
import type {
  CreateQuoteDto,
  UpdateQuoteDto,
  QuoteStatus,
  QuoteItemType,
} from '../../../../packages/shared-types/src/quote';
import { NotificationService } from './notification.service';
import {
  sanitizeQuoteDescription,
  sanitizeQuoteItemDescription,
} from '../utils/sanitization.util';
import {
  calculateItemTotal,
  calculateTotalCost,
  formatDecimal,
  validateDecimal,
  sumDecimal,
} from '../utils/decimal.util';

@Injectable()
export class QuoteService {
  private readonly logger = new Logger(QuoteService.name);

  constructor(
    @InjectRepository(Quote)
    private readonly quoteRepository: Repository<Quote>,
    @InjectRepository(QuoteItem)
    private readonly quoteItemRepository: Repository<QuoteItem>,
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,
    private readonly notificationService: NotificationService,
    private readonly dataSource: DataSource,
  ) {}

  async createQuote(
    createQuoteDto: CreateQuoteDto,
    createdBy: string,
  ): Promise<Quote> {
    this.logger.log(
      `Creating quote for ticket ${createQuoteDto.ticketId} by user ${createdBy}`,
    );

    // Check if ticket exists and doesn't already have a quote
    const ticket = await this.ticketRepository.findOne({
      where: { id: createQuoteDto.ticketId },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    if (ticket.quoteId) {
      throw new BadRequestException('Ticket already has a quote');
    }

    // Validate quote items
    if (!createQuoteDto.items || createQuoteDto.items.length === 0) {
      throw new BadRequestException('Quote must have at least one item');
    }

    // Validate each item and calculate totals
    let materialCost = 0;
    let laborCost = 0;

    for (const item of createQuoteDto.items) {
      if (!item.description || item.description.trim() === '') {
        throw new BadRequestException('Item description is required');
      }

      // Sanitize item description
      item.description = sanitizeQuoteItemDescription(item.description);

      // Validate quantity and price with decimal precision
      const validatedQuantity = validateDecimal(item.quantity, 0.01);
      const validatedUnitPrice = validateDecimal(item.unitPrice, 0);

      const itemTotal = calculateItemTotal(
        validatedQuantity,
        validatedUnitPrice,
      );

      if (item.type === 'Material') {
        materialCost = sumDecimal(materialCost, itemTotal);
      } else if (item.type === 'Labor') {
        laborCost = sumDecimal(laborCost, itemTotal);
      }
    }

    const totalCost = calculateTotalCost(materialCost, laborCost);

    // Validate total cost
    if (totalCost <= 0) {
      throw new BadRequestException('Quote total cost must be greater than 0');
    }

    // Create quote
    const quote = this.quoteRepository.create({
      ticketId: createQuoteDto.ticketId,
      createdBy,
      materialCost: formatDecimal(materialCost),
      laborCost: formatDecimal(laborCost),
      totalCost: formatDecimal(totalCost),
      description: createQuoteDto.description
        ? sanitizeQuoteDescription(createQuoteDto.description)
        : undefined,
      status: 'Pending',
    });

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const savedQuote = await queryRunner.manager.save(quote);

      // Create quote items
      const quoteItems = createQuoteDto.items.map((item) => ({
        ...item,
        totalPrice: calculateItemTotal(
          validateDecimal(item.quantity, 0.01),
          validateDecimal(item.unitPrice, 0),
        ),
        quoteId: savedQuote.id,
      }));

      await queryRunner.manager.save(QuoteItem, quoteItems);

      // Update ticket status
      await queryRunner.manager.update(Ticket, createQuoteDto.ticketId, {
        status: 'PendingQuoteApproval',
        quoteId: savedQuote.id,
      });

      // Commit transaction
      await queryRunner.commitTransaction();

      // Notify tenant (outside transaction)
      await this.notificationService.sendNotification({
        type: 'QuoteCreated',
        title: 'Quote Ready for Review',
        message: `A quote has been created for your maintenance request: ${ticket.title}`,
        recipientId: ticket.tenantId,
        data: { ticketId: ticket.id, quoteId: savedQuote.id },
      });

      this.logger.log(
        `Successfully created quote ${savedQuote.id} for ticket ${ticket.id}`,
      );

      return this.getQuoteById(savedQuote.id);
    } catch (error) {
      this.logger.error(
        `Failed to create quote for ticket ${createQuoteDto.ticketId}: ${error.message}`,
        error.stack,
      );
      // Rollback transaction on error
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      // Release query runner
      await queryRunner.release();
    }
  }

  async getQuoteById(id: string): Promise<Quote> {
    const quote = await this.quoteRepository.findOne({
      where: { id },
      relations: ['items'],
    });

    if (!quote) {
      throw new NotFoundException('Quote not found');
    }

    return quote;
  }

  async getQuotesByTicket(ticketId: string): Promise<Quote[]> {
    return this.quoteRepository.find({
      where: { ticketId },
      relations: ['items'],
      order: { createdAt: 'DESC' },
    });
  }

  async approveQuote(quoteId: string, userId: string): Promise<Quote> {
    const quote = await this.getQuoteById(quoteId);
    const ticket = await this.ticketRepository.findOne({
      where: { id: quote.ticketId },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    if (ticket.tenantId !== userId) {
      throw new ForbiddenException(
        'You can only approve quotes for your own tickets',
      );
    }

    if (quote.status !== 'Pending') {
      throw new BadRequestException('Quote is not pending approval');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Update quote status
      await queryRunner.manager.update(Quote, quoteId, { status: 'Approved' });

      // Update ticket status
      await queryRunner.manager.update(Ticket, quote.ticketId, {
        status: 'Approved',
      });

      // Commit transaction
      await queryRunner.commitTransaction();

      // Notify supervisor (outside transaction)
      await this.notificationService.sendNotification({
        type: 'QuoteApproved',
        title: 'Quote Approved',
        message: `The quote for ${ticket.title} has been approved`,
        recipientId: quote.createdBy,
        data: { ticketId: ticket.id, quoteId: quote.id },
      });

      return this.getQuoteById(quoteId);
    } catch (error) {
      // Rollback transaction on error
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      // Release query runner
      await queryRunner.release();
    }
  }

  async declineQuote(
    quoteId: string,
    userId: string,
    reason?: string,
  ): Promise<Quote> {
    const quote = await this.getQuoteById(quoteId);
    const ticket = await this.ticketRepository.findOne({
      where: { id: quote.ticketId },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    if (ticket.tenantId !== userId) {
      throw new ForbiddenException(
        'You can only decline quotes for your own tickets',
      );
    }

    if (quote.status !== 'Pending') {
      throw new BadRequestException('Quote is not pending approval');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Update quote status
      await queryRunner.manager.update(Quote, quoteId, {
        status: 'Declined',
        description: reason
          ? `${quote.description}\n\nDeclined reason: ${reason}`
          : quote.description,
      });

      // Update ticket status
      await queryRunner.manager.update(Ticket, quote.ticketId, {
        status: 'Declined',
      });

      // Commit transaction
      await queryRunner.commitTransaction();

      // Notify supervisor (outside transaction)
      await this.notificationService.sendNotification({
        type: 'QuoteDeclined',
        title: 'Quote Declined',
        message: `The quote for ${ticket.title} has been declined${reason ? `: ${reason}` : ''}`,
        recipientId: quote.createdBy,
        data: { ticketId: ticket.id, quoteId: quote.id },
      });

      return this.getQuoteById(quoteId);
    } catch (error) {
      // Rollback transaction on error
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      // Release query runner
      await queryRunner.release();
    }
  }

  async updateQuote(
    quoteId: string,
    updateQuoteDto: UpdateQuoteDto,
  ): Promise<Quote> {
    const quote = await this.getQuoteById(quoteId);

    if (quote.status !== 'Pending') {
      throw new BadRequestException('Can only update pending quotes');
    }

    // Update description if provided
    if (updateQuoteDto.description) {
      quote.description = updateQuoteDto.description;
    }

    // Update items if provided
    if (updateQuoteDto.items) {
      // Validate quote items
      if (!updateQuoteDto.items || updateQuoteDto.items.length === 0) {
        throw new BadRequestException('Quote must have at least one item');
      }

      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        // Remove existing items
        await queryRunner.manager.delete(QuoteItem, { quoteId });

        // Validate each item and calculate new totals
        let materialCost = 0;
        let laborCost = 0;

        for (const item of updateQuoteDto.items) {
          if (!item.description || item.description.trim() === '') {
            throw new BadRequestException('Item description is required');
          }

          // Sanitize item description
          item.description = sanitizeQuoteItemDescription(item.description);

          // Validate quantity and price with decimal precision
          const validatedQuantity = validateDecimal(item.quantity, 0.01);
          const validatedUnitPrice = validateDecimal(item.unitPrice, 0);

          const itemTotal = calculateItemTotal(
            validatedQuantity,
            validatedUnitPrice,
          );

          if (item.type === 'Material') {
            materialCost = sumDecimal(materialCost, itemTotal);
          } else if (item.type === 'Labor') {
            laborCost = sumDecimal(laborCost, itemTotal);
          }
        }

        const totalCost = calculateTotalCost(materialCost, laborCost);

        // Validate total cost
        if (totalCost <= 0) {
          throw new BadRequestException(
            'Quote total cost must be greater than 0',
          );
        }

        // Create new items
        const quoteItems = updateQuoteDto.items.map((item) => ({
          ...item,
          totalPrice: calculateItemTotal(
            validateDecimal(item.quantity, 0.01),
            validateDecimal(item.unitPrice, 0),
          ),
          quoteId,
        }));

        await queryRunner.manager.save(QuoteItem, quoteItems);

        // Update quote totals
        await queryRunner.manager.update(Quote, quoteId, {
          materialCost: formatDecimal(materialCost),
          laborCost: formatDecimal(laborCost),
          totalCost: formatDecimal(totalCost),
          description: updateQuoteDto.description
            ? sanitizeQuoteDescription(updateQuoteDto.description)
            : quote.description,
        });

        // Commit transaction
        await queryRunner.commitTransaction();
      } catch (error) {
        // Rollback transaction on error
        await queryRunner.rollbackTransaction();
        throw error;
      } finally {
        // Release query runner
        await queryRunner.release();
      }
    } else if (updateQuoteDto.description) {
      // Only update description
      await this.quoteRepository.update(quoteId, {
        description: sanitizeQuoteDescription(updateQuoteDto.description),
      });
    }

    return this.getQuoteById(quoteId);
  }

  async deleteQuote(quoteId: string, userId: string): Promise<void> {
    const quote = await this.getQuoteById(quoteId);

    // Check if user is the creator of the quote
    if (quote.createdBy !== userId) {
      throw new ForbiddenException('You can only delete your own quotes');
    }

    // Check if quote is already approved or declined
    if (quote.status !== 'Pending') {
      throw new BadRequestException('Can only delete pending quotes');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Delete quote items first (due to foreign key constraint)
      await queryRunner.manager.delete(QuoteItem, { quoteId });

      // Delete the quote
      await queryRunner.manager.delete(Quote, quoteId);

      // Update ticket to remove quote reference and reset status
      await queryRunner.manager.update(Ticket, quote.ticketId, {
        status: 'New',
        quoteId: undefined,
      });

      // Commit transaction
      await queryRunner.commitTransaction();
    } catch (error) {
      // Rollback transaction on error
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      // Release query runner
      await queryRunner.release();
    }
  }
}
