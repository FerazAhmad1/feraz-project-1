import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import nodemailer from "nodemailer";
import { promisify } from "util";
import jwt from "jsonwebtoken";
import user from "../model/dbusers";
import { rate_train_one, rate_train_two, rate_train_three } from "../constants";
import { getPreciseDistance } from "geolib";
import moment from "moment";
import { applyValidation } from "./validation";
import html_template from "./html";



export const protect = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    }
    if (!token) {
      throw {
        message: "please send token in headers",
      };
    }
    const decode: any = await promisify(jwt.verify)(token, process.env.JWT_SECRET || "");
    if (!decode) {
      throw {
        message: "Invalid user",
      };
    }
    const id = decode.id;

    const dbuser = await user.getUser({ id });
    if (dbuser.length === 0) {
      throw { message: "Invalid user" };
    }
    req.body.__user = dbuser[0];

    console.log("RRRRRRRRRRRRRRRRRRRRRRRR", req.body.__user, req.originalUrl)
    next();
  } catch (error) {
    console.log(req.body, "PPPPPPPPPPPPPPPPPPPPPPPPPPPPP")
    const err = error as any;
    res.status(400).json({
      error: true,
      message: err.message,
    });
  }
};

export const create_date = (date: any, time: string, minutes_to_add: number) => {
  console.log(date, time, minutes_to_add);
  // Create the initial date object from dateStr
  const initialDate = new Date(date);

  // Parse the time string
  const [hours, minutes, seconds] = time.split(":").map(Number);

  // Set the time to the initial date object
  initialDate.setHours(hours, minutes, seconds);

  // Add the specified number of minutes
  initialDate.setMinutes(initialDate.getMinutes() + minutes_to_add);
  const addLeadingZero = (num: any) => (num * 1 < 10 ? `0${num}` : num);
  console.log("sssfgdfgddfgdgfdgfwwwwwwwwwwwwwwwwww", initialDate);
  // Create the array with formatted values
  let formatedDate = [
    initialDate.getFullYear(),
    addLeadingZero(initialDate.getMonth() + 1), // getMonth() is 0-based
    addLeadingZero(initialDate.getDate()),
  ].join("-");
  const formatedTime = [
    addLeadingZero(initialDate.getHours()),
    addLeadingZero(initialDate.getMinutes()),
  ].join(":");
  return [formatedDate, formatedTime];
};

export const check_timeLimit = (dateStr: any, timeStr: any) => {
  try {
    const initialDate: any = new Date(dateStr);
    const [hours, minutes, seconds] = timeStr.split(":").map(Number);
    initialDate.setHours(hours, minutes, seconds);
    if (initialDate > new Date()) {
      const current_date = new Date() as any;
      let difference = (initialDate - current_date) / (1 * 60 * 60 * 1000);
      console.log(difference);
      if (difference >= 4) return true;
      else {
        throw {
          message:
            "you can only get the ticket before three hours of train departure from source station",
        };
      }
    }

    throw {
      message: "train  has been left source station",
    };
  } catch (error) {
    const err = error as any;
    console.log(err.message);
    throw err;
  }
};

export const restrict_to = (...allowed: any[]) => {
  console.log();
  return (req: any, res: any, next: NextFunction) => {
    if (allowed.includes(req.user.role)) {
      next();
    } else {
      res.status(401).json({
        error: true,
        message: "you are not authorize to perform this action",
        data: {},
      });
    }
  };
};

export const calculate_amount = (train_id: any, num_of_customers: any, minutes: any) => {

  let rate = 4;
  let id = train_id * 1;
  if (id === 1) {
    rate = rate_train_one;
  } else if (id === 2) {
    rate = rate_train_two;
  } else if (id === 3) {
    rate = rate_train_three;
  }


  const amount = num_of_customers * minutes * rate;
  return amount;
};

export const validateDay = (days: string, date: string, start_time: string, total_minute: number) => {

  console.log(days, date, start_time, total_minute);
  let initialDate = new Date(date);
  let day = initialDate.getDay();
  const arr = date.split("-");
  let previous_date = new Date(date);
  console.log("FFFertyrertretre", previous_date);
  const [hours, minutes, second] = start_time.split(":").map(Number);
  initialDate.setHours(hours, minutes, second);

  for (let i = day; i >= 0; i--) {
    previous_date = new Date(initialDate);
    console.log(previous_date);
    initialDate.setMinutes(initialDate.getMinutes() + total_minute);
    const a = (days[i] as any) * 1;
    if (a === 1) {
      if (initialDate.getDay() === day) return previous_date;
    }
    initialDate.setMinutes(initialDate.getMinutes() - total_minute - 1440);
  }
  return false;
};

export const formatDateString = (dateString: Date, pattern: string): string => moment(dateString).format(pattern);

export const send_mail = async ({ reciever, html, subject, sender }: any) => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || "smtp.gmail.com",
      port: parseInt(process.env.EMAIL_PORT || "587"),
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    const mailOption = {
      from: `Feraz khan <${sender}>`,
      to: reciever,
      subject: subject,
      html,
    };
    const response = await transporter.sendMail(mailOption);
    return response;
  } catch (error) {
    throw error;
  }
};


export const create_random_token = () => {

  const random_token = crypto.randomBytes(32).toString("hex");

  const hashed_token = crypto.createHash("sha256").update(random_token).digest("hex");

  return [random_token, hashed_token];
};

export const calculate_distance = (p1: any, p2: any) => {
  const distance = getPreciseDistance(p1, p2, 1);
  return distance;
};

export const calculate_general_amount = (train_type: string, distance: any, quantity = 1) => {
  let rate = 0.4;
  if (train_type === "SF") {
    rate = 0.5;
  } else if (train_type === "EX") {
    rate = 0.4;
  }

  const amount = Math.floor(rate * (distance / 1000) * quantity);
  return amount;
};

export const validate_body = (schema: any) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validate = await applyValidation(schema, req.body);
      req.body = { ...req.body, ...validate };
      console.log("fwerjdhshfsdfjsakjfaksskh", req.body)
      next();
    } catch (error) {
      const err = error as any;
      console.log(err, "qwertyeytrtru")
      res.status(400).json({
        error: true,
        message: err.message,
        data: {},
      });
    }
  };
};

export const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();


export const send_otp = async (otp: any, reciever: any) => {
  try {
    let html = html_template.replace(
      "REPLACE_WITH_HTML_CONTENT",
      `<p>this is your six digit otp . ${otp}  </p>`
    );
    html = html.replace("REPLACE_WITH_LINK", "");
    html = html.replace("REPLACE_WITH_TAB", "");
    const subject = "otp";
    const sender = "feraz@gmail.com";
    const mail_response = await send_mail({
      html,
      sender,
      subject,
      reciever,
    });
    return mail_response;
  } catch (error) {
    throw error;
  }
};


export const create_insert_many_query = (table: string, data: any[]) => {
  const column = Object.keys(data[0]);
  const columnNames = column.join(',')

  const values = data.map((record) => {

    const valueList = column.map((col) => {
      let value = record[col];
      if (typeof value === 'string') {
        value = value.replace(/'/g, '"')
      }
      return `'${value}'`
    }).join(",")

    return `(${valueList})`

  }).join(',')
  const query = `INSERT INTO ${table} (${columnNames}) VALUES ${values} RETURNING id`
  return query
}

export const signToken = (id: any) =>
  jwt.sign({ id }, process.env.JWT_SECRET || "90d", {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
