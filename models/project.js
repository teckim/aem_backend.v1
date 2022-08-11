const mongoose = require('mongoose')

const Schema = mongoose.Schema
let projectSchema = new Schema({
    createdBy: { type: mongoose.Types.ObjectId, required: true ,ref: 'User' }, // the userId of the project responsible
    title: { type: String, required: true },
    description: { type: String, required: true },
    image: {type: Object},
    createdOn: { type: Date, default: Date.now } 
}) 

let Project = mongoose.model('Project', projectSchema)

module.exports = Project


