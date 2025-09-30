import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Ticket, TicketStatus } from '@/types';
import { AlertTriangle, Clock, CheckCircle, Users } from 'lucide-react';

interface TicketStatsProps {
  tickets: Ticket[];
}

export function TicketStats({ tickets }: TicketStatsProps) {
  const stats = {
    total: tickets.length,
    new: tickets.filter(t => t.status === TicketStatus.New).length,
    assigned: tickets.filter(t => t.status === TicketStatus.Assigned).length,
    inProgress: tickets.filter(t => t.status === TicketStatus.InProgress).length,
    completed: tickets.filter(t => t.status === TicketStatus.Completed).length,
    emergency: tickets.filter(t => t.priority === 'Emergency').length,
    high: tickets.filter(t => t.priority === 'High').length,
    medium: tickets.filter(t => t.priority === 'Medium').length,
    low: tickets.filter(t => t.priority === 'Low').length,
  };

  const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total}</div>
          <p className="text-xs text-muted-foreground">
            All tickets in system
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">New Tickets</CardTitle>
          <AlertTriangle className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">{stats.new}</div>
          <p className="text-xs text-muted-foreground">
            Waiting for assignment
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">In Progress</CardTitle>
          <Clock className="h-4 w-4 text-yellow-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-yellow-600">{stats.inProgress}</div>
          <p className="text-xs text-muted-foreground">
            Currently being worked on
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
          <CheckCircle className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{completionRate}%</div>
          <p className="text-xs text-muted-foreground">
            {stats.completed} of {stats.total} completed
          </p>
        </CardContent>
      </Card>

      {/* Priority Breakdown */}
      <Card className="md:col-span-2 lg:col-span-4">
        <CardHeader>
          <CardTitle>Priority Distribution</CardTitle>
          <CardDescription>
            Tickets by priority level
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <span className="font-medium">Emergency</span>
              </div>
              <Badge className="bg-red-500 text-white">{stats.emergency}</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                <span className="font-medium">High</span>
              </div>
              <Badge className="bg-orange-500 text-white">{stats.high}</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                <span className="font-medium">Medium</span>
              </div>
              <Badge className="bg-yellow-500 text-white">{stats.medium}</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-green-500" />
                <span className="font-medium">Low</span>
              </div>
              <Badge className="bg-green-500 text-white">{stats.low}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}