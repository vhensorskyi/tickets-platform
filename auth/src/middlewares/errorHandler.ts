import { NextFunction, Request, Response } from "express";

import { CustomError } from "../errors/customError";

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  const generalError = 'Opps...something went wrong!'

  if (err instanceof CustomError) {
    return res.status(err?.statusCode).send({ errors: err?.serializeError() })
  }

  res.status(500).send({ errors: [{ message: generalError }] })
}