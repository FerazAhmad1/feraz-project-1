import { appdb } from "./appdb"

type station_col = {
    [index: string]: string
    id: any
} | {
    [index: string]: string
    station_name_or_code: any
}

class station extends appdb {
    constructor() {
        super();
        this.table = 'station';
        this.uniqueField = 'id';
    }

    async search_station(station_data: station_col, field: string, page: number) {
        console.log(station_data)
        this.page = page
        this.rpp = 40
        let start = (this.page - 1) * this.rpp
        if (station_data.id) {
            this.where = `WHERE id = '${station_data.id}'`
        } else if (station_data.station_name_or_code) {
            const { station_name_or_code } = station_data
            this.where = `where code ILIKE '%${station_name_or_code}%' OR stn_name ILIKE '%${station_name_or_code}%' ORDER BY stn_name desc LIMIT '${this.rpp}' OFFSET '${start}' `;
        }
        console.log(this.where)
        return this.select(this.table, field, this.where, '', '')

    }

}

const station_obj = new station()
export default station_obj