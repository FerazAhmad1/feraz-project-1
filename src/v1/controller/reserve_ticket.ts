import { Request, Response } from "express";
import reservation from "../model/dbreservetickets";


export const create_reserve_ticket = async (req: Request, res: Response) => {
  console.log("fffffffffffffffffffffffffffffffffffffffffffffff")
  try {
    console.log("req.bodyRRRRRRRRRRRRRRRRRRRRRRRRRRR", req.body)
    const response = await reservation.ticket_reservation(req.body, req.body.__user);
    if (!response || response.error) {
      throw {
        message: response?.message || "your model function is not working"
      }
    }
    res.status(200).json(response)
  } catch (error) {
    const err = error as any;
    console.log(err)
    res.status(400).json({
      error: true,
      message: err.message || "UNEXPECTED ERROR",
      data: {},
    });
  }
};

export const get_all_ticket = async (req: Request, res: Response) => {
  try {
    let { page } = req.body
    page = page * 1
    const user = req.body.__user
    const response = await reservation.get_all_ticket(user, page);
    if (!response || response.error) {
      throw {
        message: response?.message || "your model function is not working"
      }
    }

    res.status(200).json(response)

  } catch (error) {
    const err = error as any
    res.status(400).json({
      error: true,
      message: err.message || "UNEXPECTED ERROR",
      data: {}
    });
  }
};

export const cancel_ticket = async (req: Request, res: Response) => {
  try {
    const user = req.body.__user;
    const validate = req.body
    const response = await reservation.cancel_ticket(validate, user)
    if (!response || response.error) {
      throw {
        message: response?.message || "your model function is not working"
      }
    }

    res.status(200).json(response)
  } catch (error) {
    const err = error as any;
    res.status(400).json({
      error: true,
      message: err.message || "UNEXPECTED ERROR",
      data: {},
    });
  }
};
