import { appdb } from "./appdb";

interface signup_user {
  readonly firstName: string;
  readonly lastName: string;
  readonly mobile: number;
  readonly password: string;
}

type login_user =
  | {
      [index: string]: string;
      readonly email: string;
    }
  | { [index: string]: number; readonly id: number };

export class dbusers extends appdb {
  constructor() {
    super();
    this.table = "users";
    this.uniqueField = "id";
  }
  static whereClause(obj: login_user) {
    let where = "WHERE ";
    for (let key in obj) {
      where += `${key} = '${obj[key]}' `;
    }
    return where;
  }
  async insertUser(userObj: any) {
    try {
      return await this.insertRecord(userObj);
    } catch (error) {
      throw error;
    }
  }
  async getUser(login_body: login_user) {
    try {
      this.where = dbusers.whereClause(login_body);
      this.page = 1;
      this.rpp = 1;
      this.orderby = "";
      const user: any[] = await this.listRecords("*");

      return user;
    } catch (error) {
      throw error;
    }
  }
  async update_user(id: number, data: any) {
    try {
      return await this.updateRecord(id, data);
    } catch (error) {
      throw error;
    }
  }
}
const user = new dbusers();
export default user;
