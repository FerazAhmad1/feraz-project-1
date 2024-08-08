import { Request, Response } from "express";
import general_ticket_obj from "../model/general_ticket";




export const create_general_ticket = async function (req: Request, res: Response) {
  try {
    const user = req.body.__user
    const response = await general_ticket_obj.create_general_ticket(req.body, user);
    if (!response || response.error) {
      throw {
        message: response?.message || "your model function is not working"
      }
    }
    res.status(200).json(response)
  } catch (error) {
    const err = error as any;
    res.status(err.errorCode || 400).json({
      error: false,
      message: err.message || "UNEXPECTED ERROR",
      data: {},
    });
  }
};
