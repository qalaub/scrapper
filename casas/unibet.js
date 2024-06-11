const { initRequest } = require("../logic/utils/request");
const { getBetForBetplay } = require("./betplay");

async function getUnibetApi(event, betTypes) {
    const res = await
        initRequest(`https://eu-offering-api.kambicdn.com/offering/v2018/ub/betoffer/event/${event.id}.json?lang=en_GB&market=ZZ&client_id=2&channel_id=1&includeParticipants=true`);
    if (res)
        if (res.betOffers) {
            return {
                nombre: 'unibet',
                title: event.name,
                bets: getBetForBetplay(res.betOffers, betTypes, 'UNITBET')
            }
        }

}


module.exports = {
    getUnibetApi,
}
