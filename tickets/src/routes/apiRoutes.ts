import { NotAuthorizedError, NotFoundError, TicketData, requestValidate, userAuthorize, userSet } from "@vhticketing/common";
import express, { Request, Response } from "express";

import { Ticket } from "../models/ticket";
import { TicketCreatedPublisher } from "../events/publishers/ticketCreatedPublisher";
import { body } from "express-validator";
import { natsWrapper } from "../../natsWrapper";

const apiRouter = express.Router()

apiRouter.post('/tickets', userSet, userAuthorize, [
  body('title')
    .not()
    .isEmpty()
    .withMessage('title is required'),
  body('price')
    .isFloat({ gt: 0 })
    .withMessage('Must be greater than 0')
], requestValidate, async (req: Request, res: Response) => {

  const { title, price } = req.body

  const ticket = Ticket.build({ title, price, userId: req.currentUser!.id })
  const ticketResponse = await ticket.save()

  const ticketCreatedPublisher = new TicketCreatedPublisher(natsWrapper.client)
  ticketCreatedPublisher.publish(ticket as TicketData)

  res.status(201).send(ticketResponse)
})


apiRouter.get('/tickets/:id', async (req: Request, res: Response) => {
  const ticketId = req.params?.id

  const ticket = await Ticket.findById(ticketId)

  if (!ticket) {
    throw new NotFoundError('Ticket was not found')
  }

  res.send(ticket)
})


apiRouter.put('/tickets/:id', userSet, userAuthorize, [
  body('title')
    .not()
    .isEmpty()
    .optional()
    .withMessage('title is required'),
  body('price')
    .isFloat({ gt: 0 })
    .optional()
    .withMessage('Must be greater than 0')
], requestValidate, async (req: Request, res: Response) => {
  const ticketId = req.params?.id

  const ticket = await Ticket.findById(ticketId)

  if (!ticket) {
    throw new NotFoundError('Ticket was not found')
  }

  if (ticket.userId !== req.currentUser?.id) {
    throw new NotAuthorizedError()
  }

  const { title, price } = req.body

  ticket.set(title ? { title } : { price })
  await ticket.save()

  res.send(ticket)
})

export default apiRouter