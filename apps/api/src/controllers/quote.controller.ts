import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Req,
  Delete,
  Put,
  UseGuards,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { QuoteService } from '../services/quote.service';
import { FirebaseAuthGuard } from '../guards/firebase-auth.guard';
import { RateLimitGuard } from '../guards/rate-limit.guard';
import { Roles } from '../decorators/roles.decorator';
import { CreateQuoteDto } from '../dtos/create-quote.dto';
import { UpdateQuoteDto } from '../dtos/update-quote.dto';
import { ErrorHandlingService } from '../services/error-handling.service';
import type { Request } from 'express';

@Controller('quotes')
export class QuoteController {
  constructor(
    private readonly quoteService: QuoteService,
    private readonly errorHandlingService: ErrorHandlingService,
  ) {}

  @Post()
  @UseGuards(FirebaseAuthGuard, RateLimitGuard)
  @Roles('supervisor', 'admin')
  async createQuote(
    @Body() createQuoteDto: CreateQuoteDto,
    @Req() req: Request,
  ) {
    try {
      const userId = (req as any).user.id;
      return await this.quoteService.createQuote(createQuoteDto, userId);
    } catch (error) {
      this.errorHandlingService.handleError(
        error,
        'QuoteController.createQuote',
      );
    }
  }

  @Get(':id')
  @UseGuards(FirebaseAuthGuard)
  async getQuote(@Param('id') id: string) {
    try {
      return await this.quoteService.getQuoteById(id);
    } catch (error) {
      this.errorHandlingService.handleError(error, 'QuoteController.getQuote');
    }
  }

  @Get('ticket/:ticketId')
  @UseGuards(FirebaseAuthGuard)
  async getQuotesByTicket(@Param('ticketId') ticketId: string) {
    try {
      return await this.quoteService.getQuotesByTicket(ticketId);
    } catch (error) {
      this.errorHandlingService.handleError(
        error,
        'QuoteController.getQuotesByTicket',
      );
    }
  }

  @Put(':id')
  @UseGuards(FirebaseAuthGuard)
  @Roles('supervisor', 'admin')
  async updateQuote(
    @Param('id') id: string,
    @Body() updateQuoteDto: UpdateQuoteDto,
    @Req() req: Request,
  ) {
    try {
      const userId = (req as any).user.id;
      const quote = await this.quoteService.getQuoteById(id);

      // Check if user is the creator of the quote
      if (quote.createdBy !== userId) {
        throw new HttpException(
          'You can only update your own quotes',
          HttpStatus.FORBIDDEN,
        );
      }

      return await this.quoteService.updateQuote(id, updateQuoteDto);
    } catch (error) {
      this.errorHandlingService.handleError(
        error,
        'QuoteController.updateQuote',
      );
    }
  }

  @Post(':id/approve')
  @UseGuards(FirebaseAuthGuard)
  @Roles('tenant')
  async approveQuote(@Param('id') id: string, @Req() req: Request) {
    try {
      const userId = (req as any).user.id;
      return await this.quoteService.approveQuote(id, userId);
    } catch (error) {
      this.errorHandlingService.handleError(
        error,
        'QuoteController.approveQuote',
      );
    }
  }

  @Post(':id/decline')
  @UseGuards(FirebaseAuthGuard)
  @Roles('tenant')
  async declineQuote(
    @Param('id') id: string,
    @Req() req: Request,
    @Body('reason') reason?: string,
  ) {
    try {
      const userId = (req as any).user.id;
      return await this.quoteService.declineQuote(id, userId, reason);
    } catch (error) {
      this.errorHandlingService.handleError(
        error,
        'QuoteController.declineQuote',
      );
    }
  }

  @Delete(':id')
  @UseGuards(FirebaseAuthGuard)
  @Roles('supervisor', 'admin')
  async deleteQuote(@Param('id') id: string, @Req() req: Request) {
    try {
      const userId = (req as any).user.id;
      await this.quoteService.deleteQuote(id, userId);
      return { message: 'Quote deleted successfully' };
    } catch (error) {
      this.errorHandlingService.handleError(
        error,
        'QuoteController.deleteQuote',
      );
    }
  }
}
