import { Request, Response } from "express";

import train_obj from "../model/traindb";



export const search_train = async (req: Request, res: Response) => {
  try {

    const validate = req.body
    const user = req.body.__user
    const response = await train_obj.search_train(validate, user);
    if (!response || response.error) {
      throw {
        message: response?.message || "your model function is not working"
      }
    }

    res.status(200).json(response)
  } catch (error) {
    const err = error as any;
    res.status(400).json({
      error: false,
      message: err.message || "UNEXPECTED ERROR",
      data: {}
    });
  }
};
