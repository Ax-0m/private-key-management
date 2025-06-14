import type { NextFunction, Request, Response } from "express";
import type { Error } from "mongoose";
import zod from "zod";
import { userModel } from "./db";

export const userValidation = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { username, password } = req.body;

  try {
    zod
      .object({
        username: zod.string().email(),
        password: zod.string().min(6),
      })
      .parse({ username, password });
    next();
  } catch (err: any) {
    res.status(400).json({
      message: "Incorrect Inputs",
      error: err.message,
    });
  }
};

export const userValidationSignup = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { username } = req.body;
  try {
    const exists = await userModel.findOne({ username });
    if (!exists) {
      next();
    } else {
      res.status(400).json({
        message: "User exists, pls signin",
      });
    }
  } catch (err: any) {
    res.status(500).json({
      error: err.message,
    });
  }
};
