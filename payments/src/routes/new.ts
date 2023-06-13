import { BadRequestError, NotAuthorizedError, NotFoundError, OrderStatus, requestValidate, userAuthorize } from "@vhticketing/common";
import { Request, Response, Router } from "express";

import { Order } from "../models/order";
import { Payment } from "../models/payment";
import { PaymentCreatedPublisher } from "../events/publishers/paymentCreatedPublisher";
import { body } from "express-validator";
import { natsWrapper } from "../natsWrapper";
import { stripe } from "../stripe";

const chargeRouter = Router()

chargeRouter.post('/api/payments', 
    userAuthorize, 
    [body('token').notEmpty(), body('orderId').notEmpty()], 
    requestValidate, 
    async(req: Request, res: Response) => {
        const {token, orderId} = req.body

        const order = await Order.findById(orderId)

        if(!order){
            throw new NotFoundError()
        }
        if(order.userId !== req.currentUser?.id) {
            throw new NotAuthorizedError()
        }
        if(order.status === OrderStatus.Canceled) {
            throw new BadRequestError('Can not pay for cancelled order')
        }

        const charge = await stripe.charges.create({
            currency:'usd',
            amount: order.price * 100,
            source: token
        })
        
        const payment = Payment.build({ orderId, stripeId: charge.id })
        await payment.save()

        new PaymentCreatedPublisher(natsWrapper.client).publish({
            id: payment.id,
            orderId: payment.orderId,
            stripeId: payment.stripeId
        })
        
        res.status(201).send({id: payment.id})
})

export {chargeRouter}