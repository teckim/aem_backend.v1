const mongoose = require('mongoose')

const Schema = mongoose.Schema
let joinSchema = new Schema({
    user: { type: mongoose.Types.ObjectId, required: true, ref: 'User' },
    office: { type: mongoose.Types.ObjectId, required: true, ref: 'Office' },
    position: { type: String },
    handled: { type: Boolean, default: false },
    createdOn: { type: Date, default: Date.now }
})

let Join = mongoose.model('Join', joinSchema)

module.exports = Join