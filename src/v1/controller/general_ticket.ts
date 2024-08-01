import { Request, Response } from "express";
import { general_ticket_schema } from "../helper.ts/schema";
import { applyValidation } from "../helper.ts/validation";
import general_ticket_obj from "../model/general_ticket";
import {
  calculate_distance,
  calculate_general_amount,
  formatDateString,
} from "../helper.ts/helpfn";
import train_obj from "../model/traindb";

interface CustomRequest extends Request {
  user: {
    [index: string]: any;
  };
}

export const create_general_ticket = async (req: Request, res: Response) => {
  try {
    const validate = await applyValidation(general_ticket_schema, req.body);
    let query_one = `select id, lat as latitude,long as longitude from station where code ILIKE '%${validate.from}%' OR stn_name ILIKE '%${validate.from}%' ORDER BY stn_name LIMIT 1 `;
    let query_two = `select id, lat as latitude,long as longitude from station where code ILIKE '%${validate.to}%' OR stn_name ILIKE '%${validate.to}%' ORDER BY stn_name LIMIT 1 `;
    const [[from_station], [to_staion]] = await Promise.all([
      train_obj.executeQuery(query_one),
      train_obj.executeQuery(query_two),
    ]);
    console.log(to_staion, from_station);
    if (!from_station) {
      throw { message: "no source station found " };
    }
    if (!to_staion) {
      throw {
        message: "no destination station found",
      };
    }
    const p1 = {
      latitude: from_station.latitude,
      longitude: from_station.longitude,
    };
    const p2 = { latitude: to_staion.latitude, longitude: to_staion.longitude };
    const distance = calculate_distance(p1, p2);
    console.log(distance / 1000);

    const amount = calculate_general_amount(
      validate.train_type,
      distance,
      validate.quantity
    );
    const right_now = formatDateString(new Date(), "YYYY-MM-DD HH:mm:ss");
    const response = await general_ticket_obj.insert_general_ticket({
      amount,
      agentid: (req as CustomRequest).user.id,
      source_stn: from_station.id * 1,
      destination_stn: to_staion.id * 1,
      date_time: right_now,
      quantity: validate.quantity,
    });

    res.status(200).json({
      from: validate.from,
      to: validate.to,
      amount,
    });
  } catch (error) {
    const err = error as any;
    res.status(err.errorCode || 400).json({
      error: false,
      message: err.message,
      data: {},
    });
  }
};
