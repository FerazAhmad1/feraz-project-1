import { Request, Response } from "express";
import { applyValidation } from "../helper.ts/validation";
import {
  reserve_ticket_schema,
  cancel_ticket_schema,
} from "../helper.ts/schema";
import users from "../model/dbusers";
import CUSTOEMER_TICKET from "../model/dbcustomerticket";
import general_ticket_obj from "../model/general_ticket";
import {
  create_date,
  calculate_amount,
  validateDay,
  formatDateString,
} from "../helper.ts/helpfn";

import reservation from "../model/dbreservetickets";

interface CustomRequest extends Request {
  user: {
    [index: string]: any;
  };
}

export const create_reserve_ticket = async (req: Request, res: Response) => {
  try {
    // vaidate login user limit
    // validate request body

    const validate = await applyValidation(reserve_ticket_schema, req.body);

    // find train source station and destination station

    const find_train_query = `select * from train where t_number = '${validate.trainnumber}'`;
    const find_source_staion_query = `select * from station where code ILIKE '%${validate.from}%' OR stn_name ILIKE '%${validate.from}%' ORDER BY stn_name LIMIT 1 `;
    const find_destination_query = `select * from station where code ILIKE '%${validate.to}%' OR stn_name ILIKE '%${validate.to}%' ORDER BY stn_name LIMIT 1  `;

    const [[train], [source_station], [destination_station]] =
      await Promise.all([
        reservation.executeQuery(find_train_query),
        reservation.executeQuery(find_source_staion_query),
        reservation.executeQuery(find_destination_query),
      ]);

    // validate if enter input exist in database or not
    if (!train || !source_station || !destination_station) {
      throw {
        message: "your input is incorrect either train number or  station name",
      };
    }

    // validate train if it runs beatween selected stations
    const source_station_id = source_station.id;

    const destination_station_id = destination_station.id;

    const train_id = train.id;

    const find_schedule_for_source = `select id, stop_order,minutes_required_to_reach_from_source_station from schedule where station_id = '${source_station_id}' AND train_id = '${train_id}' `;

    const find_schedule_for_destination = `select id, stop_order,minutes_required_to_reach_from_source_station from schedule where station_id = '${destination_station_id}' AND train_id = '${train_id}' `;
    const [[source_schedule], [destination_schedule]] = await Promise.all([
      reservation.executeQuery(find_schedule_for_source),
      reservation.executeQuery(find_schedule_for_destination),
    ]);

    if (!source_schedule || !destination_schedule) {
      throw {
        message:
          "selected train does not runs between selected source and destination",
      };
    }
    // validate stop order
    if (source_schedule.stop_order > destination_schedule.stop_order) {
      throw {
        message:
          "selected train does not runs between selected source and destination",
      };
    }

    //  validate if trains runs on selected date or not .some trains runs two days or three days

    // validate if ticket is available or not

    // make response
    const train_start_time = train.start_time;
    const source_minute =
      source_schedule.minutes_required_to_reach_from_source_station;

    const train_date = validateDay(
      train.days,
      validate.startdate,
      train.start_time,
      source_minute * 1
    );

    if (!train_date) {
      throw { message: "Train does not run on specified date" };
    }

    const formated_train_date = formatDateString(
      train_date,
      "YYYY-MM-DD HH:mm:ss"
    );

    const count_ticket_query = `SELECT COUNT(*)
    FROM tickets
    WHERE source_date = '${formated_train_date}'
      AND train_id = ${train_id}
      AND status = '${1}';
    `;
    let [{ count }] = await reservation.executeQuery(count_ticket_query);
    count = count * 1;
    if (count >= 250) {
      throw {
        message: "Not available",
      };
    }
    if (count < 250 && count + validate.customers.length > 250) {
      let difference = 250 - count;
      throw {
        message: `only ${difference} ticket is available`,
      };
    }

    console.log(
      "FFFFFFFFFFFFFFFFFFFFFFFFFFFFF",
      train_date,
      formated_train_date
    );

    const destination_minutes =
      destination_schedule.minutes_required_to_reach_from_source_station * 1;

    const [start_d_j, arrival_time_at_source_station] = create_date(
      train_date,
      train_start_time,
      source_minute * 1
    );

    const [end_date_of_journey, arrival_time_at_destination_station] =
      create_date(train_date, train_start_time, destination_minutes);

    const enddate = [
      end_date_of_journey,
      arrival_time_at_destination_station,
    ].join(" ");
    let pnr = Date.now().toString().slice(-7) + "123";

    // insert ticket in tickets table
    const amount = calculate_amount(
      train_id,
      validate.customers.length,
      destination_minutes - source_minute
    );
    const seatnumber = 1;
    const userid = 1;

    const { mobile, familymobile, email, district, country, pincode, state } =
      validate;
    const ticket_entry_data = {
      quantity: validate.customers.length,
      startdate: validate.startdate,
      enddate,
      amount,
      mobile,
      familymobile,
      email,
      status: 1,
      district,
      country,
      pincode,
      state,
      pnr,
      userid: (req as CustomRequest).user.id,
      source_date: formated_train_date,
      train_id,
      start_schedule: source_schedule.id,
      end_schedule: destination_schedule.id,
    };
    console.log("Ticket-entry-data", ticket_entry_data);
    const response = await reservation.insert_reserve_ticket(ticket_entry_data);
    console.log("RRRRRrr", response);
    // insert customers in customer table

    const insert_customer_response = await Promise.all(
      validate.customers.map(({ firstname, lastname, dob }: any) => {
        return users.insertUser({
          firstname,
          lastname,
          dob: formatDateString(dob, "YYYY-MM-DD HH:mm:ss"),
        });
      })
    );
    console.log(insert_customer_response);

    // const customer_entry_data = { firstname, lastname, dob };
    // insert ticket id and customer id in customerticket table
    const start = count + 1;
    let all_seat: number[] = [];
    const insert_customer_ticket = await Promise.all(
      insert_customer_response.map((id: any, i: number) => {
        const seat_number = start + i;
        all_seat.push(seat_number);
        return CUSTOEMER_TICKET.insert_customer_ticket({
          customerid: id,
          ticketid: response,
          seat_number,
        });
      })
    );
    console.log(insert_customer_ticket);

    const data = {
      souce_station_name: source_station.stn_name,
      source_station_departure_time: arrival_time_at_source_station,
      start_date_of_journey: validate.startdate,
      destination_station_name: destination_station.stn_name,
      seats: all_seat,
      passengers: validate.customers,
      end_date_of_journey,
      arrival_time_at_destination_station,
      train_number: validate.trainnumber,
      pnr,
    };

    res.status(200).json({
      error: false,
      data,
      message: "this is your ticket",
    });
    // const customerticket_entry_data = { ticketid, customerid };
  } catch (error) {
    const err = error as any;
    res.status(400).json({
      error: true,
      message: err.message,
      data: {},
    });
  }
};

export const get_all_ticket = async (req: Request, res: Response) => {
  try {
    const general_ticket_query = `select * from general_ticker where agentid = '${
      (req as CustomRequest).user.id
    }'  `;
    const reservation_ticket_query = `select * from tickets where userid = '${
      (req as CustomRequest).user.id
    }' `;

    const [resevation_ticket, general_ticket] = await Promise.all([
      reservation.executeQuery(reservation_ticket_query),
      general_ticket_obj.executeQuery(general_ticket_query),
    ]);
    let message = "success";
    if (!resevation_ticket && general_ticket) {
      message = "you did not cut a single ticket";
    }

    res.status(200).json({
      error: false,
      message: message,
      data: { resevation_ticket, general_ticket },
    });
  } catch (error) {
    res.status(400).json({
      error: true,
    });
  }
};

export const cancel_ticket = async (req: Request, res: Response) => {
  try {
    console.log((req as CustomRequest).user);
    const validate = await applyValidation(cancel_ticket_schema, req.body);
    const find_query_ticket = `select id, status,userid from tickets where pnr = '${validate.pnr}'  `;
    const ticket = await reservation.executeQuery(find_query_ticket);
    console.log(ticket);
    if (!ticket) {
      throw {
        message: "this is wrong pnr",
      };
    }
    if (ticket.length == 0) {
      throw {
        message: "this is wrong pnr",
      };
    }
    let response;

    if ((req as CustomRequest).user.role === "railway") {
      const response = await reservation.update_reserve_ticket(ticket[0].id, {
        status: "0",
      });
      console.log(response);
      if (!response) {
        throw {
          message: "Internal server error",
        };
      }
      res.status(200).json({
        error: false,
        message: "your ticket has been cancel",
        dtat: {
          pnr: validate.pnr,
        },
      });
      return;
    } else if ((req as CustomRequest).user.id !== ticket[0].userid) {
      throw {
        message: "you ca not cancel other's ticket",
      };
    } else {
      const response = await reservation.update_reserve_ticket(ticket[0].id, {
        status: 0,
      });
      if (!response) {
        throw {
          message: "Internal server error",
        };
      }
      res.status(200).json({
        error: false,
        message: "your ticket has been cancel",
        dtat: {
          pnr: validate.pnr,
        },
      });
    }
  } catch (error) {
    const err = error as any;
    res.status(400).json({
      error: true,
      message: err.message,
      data: {},
    });
  }
};
