import { appdb } from "./appdb"

type schedule_col = {
    [index: string]: string
    station_id: string
    train_id: string
    fields: string
}

class dbschedule extends appdb {
    constructor() {
        super();
        this.table = 'schedule';
        this.uniqueField = 'id';
    }

    async get_schedule(schedule_data: schedule_col) {
        const { station_id, train_id, fields } = schedule_data
        this.where = `WHERE station_id = '${station_id}' AND train_id = '${train_id}' `
        return this.select(this.table, fields, this.where, '', '20')
    }

    async get_trains_from_source_to_destination(from_station_id: any, to_station_id: any, field: string, page: number) {
        try {
            this.where = `WHERE  s1.station_id=${from_station_id} AND s2.station_id=${to_station_id} AND s1.stop_order < s2.stop_order `;
            this.page = page
            return this.listRecords(field)

        } catch (error) {
            throw error
        }
    }


}


const schedule_obj = new dbschedule();
export default schedule_obj