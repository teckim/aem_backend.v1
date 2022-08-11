const User = require('../../models/user')
const Event = require('../../models/event')
const Order = require('../../models/order')
const auth = require("../middleware/auth");
const ac = require("../../roles");
const { email } = require("../../plugins/helpers");


module.exports = (router) => {
    // GET users number
    router.get('/insights/users/count', (req, res) => {
        let auth = isAuthorized(req.headers.authorization)
        if (!auth) return res.status(401).send()
        if (!roles.can(auth.role).readOwn('insights').granted) return res.status(401).send()
        if (!!auth.office) {
            User.countDocuments({ role: 'user', followOffice: auth.office }).exec()
                .then(count => res.status(200).json(count))
                .catch(err => res.status(500).send())
        } else {
            User.countDocuments({ role: 'user' }).exec()
                .then(count => res.status(200).json(count))
                .catch(err => res.status(500).send())
        }
    })
    // GET users percentage:
    router.get('/insights/users/progress', (req, res) => {
        let auth = isAuthorized(req.headers.authorization)
        if (!auth) return res.status(401).send()
        if (!roles.can(auth.role).readOwn('insights').granted) return res.status(401).send()
        let date = new Date()

        let end = new Date(date.setDate(0))
        let start = new Date(date.setMonth(date.getMonth() - 1))

        let end1 = new Date(date.setDate(0))
        let start1 = new Date(date.setDate(1))
        if (!!auth.office) {
            User.countDocuments({ role: 'user', createdOn: { $and: [{ $lte: end }, { $gte: start }] }, office: auth.office }).exec()
                .then(data1 => {
                    let count1 = data1
                    User.countDocuments({ createdOn: { $lte: end1, $gte: start1 } }).exec()
                        .then(data2 => {
                            let count2 = data2
                            let p = count1 - count2
                            res.status(200).json(p)
                        })
                        .catch(err => res.status(500).send(err))
                })
                .catch(err => res.status(500).send(err))

        } else {
            User.countDocuments({ role: 'user', createdOn: { $lte: end, $gte: start } }).exec()
                .then(data1 => {
                    let count1 = data1
                    User.countDocuments({ createdOn: { $lte: end1, $gte: start1 } }).exec()
                        .then(data2 => {
                            let count2 = data2
                            let p = count1 - count2
                            res.status(200).json(p)
                        })
                        .catch(err => res.status(500).send(err))
                })
                .catch(err => res.status(500).send(err))
        }
    })
    // GET events number
    router.get('/insights/events/count', (req, res) => {
        let auth = isAuthorized(req.headers.authorization)
        if (!auth) return res.status(401).send()
        if (!roles.can(auth.role).readOwn('insights').granted) return res.status(401).send()
        if (!!auth.office) {
            Event.countDocuments({ office: auth.office }).exec()
                .then(count => res.status(200).json(count))
                .catch(err => res.status(500).send())
        } else {
            Event.countDocuments().exec()
                .then(count => res.status(200).json(count))
                .catch(err => res.status(500).send())
        }
    })
    router.get('/insights/events/progress', (req, res) => {
        let auth = isAuthorized(req.headers.authorization)
        if (!auth) return res.status(401).send()
        if (!roles.can(auth.role).readOwn('insights').granted) return res.status(401).send()
        let date = new Date()
        date.setUTCHours(0, 0, 0, 0)
        // date.setHours(0)
        // date.setMinutes(0)
        // date.setSeconds(0)
        // date = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0)
        let end = new Date(date.setDate(0))
        let start = new Date(date.setMonth(date.getMonth() - 1))
        console.log(end, start)
        let end1 = new Date(date.setDate(0))
        let start1 = new Date(date.setDate(1))

        if (!!auth.office) {
            Event.countDocuments({ createdOn: { $lte: end, $gte: start }, office: auth.office }).exec()
                .then(count1 => {
                    Event.countDocuments({ createdOn: { $lte: end1, $gte: start1 }, office: auth.office }).exec()
                        .then(count2 => {
                            let p = count1 - count2
                            res.status(200).json(p)
                        })
                })
                .catch(err => res.status(500).send())
        } else {
            Event.countDocuments({ createdOn: { $lte: end, $gte: start } }).exec()
                .then(count1 => {
                    console.log(count1)
                    Event.countDocuments({ createdOn: { $lte: end1, $gte: start1 } }).exec()
                        .then(count2 => {
                            console.log(count2)
                            let p = count1 - count2
                            res.status(200).json(p)
                        })
                })
                .catch(err => res.status(500).send())
        }

    })
    // GET last event participants number
    router.get('/insights/events/last-event', (req, res) => {
        Event.findOne({ endsOn: { $lte: new Date() } }, '_id').sort('-endsOn').exec()
            .then(eventId => {
                Order.countDocuments({ event: eventId }).exec()
                    .then(count => res.status(200).json(count))
                    .catch(err => res.status(500).send())
            })
            .catch(err => res.status(500).send())
    })
    // GET general 
    router.get('/insights/general', async (req, res) => {
        let insights = {}
        insights.users = await User.countDocuments()
        insights.events = await Event.countDocuments()
        insights.tickets = await Order.countDocuments()
        res.send(insights)
    })
}
