import { Subjects } from './types/subjects';

export interface TicketData {
  id: string
  title: string
  price: number
  userId: string
  version: number
  orderId?: string
}

export interface TicketCreatedEvent {
  subject: Subjects.TicketCreated
  data: TicketData
}
