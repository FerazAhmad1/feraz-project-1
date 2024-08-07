import { appdb } from "./appdb";
import station_obj from "./dbstation";
import { calculate_distance, calculate_general_amount, formatDateString } from "../helper.ts/helpfn";

import train_obj from "./traindb";

type unique_data_type = {
  [index: string]: string
  uniquefield: any,
  uniquefieldname: string,
  field: string
}
class general_ticket extends appdb {
  constructor() {
    super();
    this.table = "general_ticket";
    this.uniqueField = "id";
  }

  async insert_general_ticket(data: any) {
    try {
      return await this.insertRecord(data);
    } catch (error) {
      throw error;
    }
  }

  async get_general_ticket(data: unique_data_type) {
    const { uniquefield, uniquefieldname, field } = data
    this.where = `WHERE '${uniquefieldname}'='${uniquefield}'`

    return this.select(this.table, field, this.where, '', '20')
  }

  async create_general_ticket(req_body: any, user: any) {
    try {
      const validate = req_body
      const source_station_query = station_obj.search_station({ station_name_or_code: validate.from }, "*", 1)

      const destination_station_query = station_obj.search_station({ station_name_or_code: validate.to }, "*", 1)

      const [[from_station], [to_staion]] = await Promise.all([source_station_query, source_station_query, destination_station_query]);

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
      const response = await this.insert_general_ticket({
        amount,
        agentid: user.id,
        source_stn: from_station.id * 1,
        destination_stn: to_staion.id * 1,
        time: right_now,
        quantity: validate.quantity,
      });

      const data = {
        from: validate.from,
        to: validate.to,
        amount,
      };

      return {
        error: false,
        message: "this is your general ticket",
        data
      }
    } catch (error) {
      throw error
    }
  }
}

const obj = new general_ticket();

export default obj;
