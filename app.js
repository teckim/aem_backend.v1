const express = require('express')
const cors = require('cors')
const api = require('./api')
const bodyParser = require('body-parser')
const app = express()

app.use(cors())

app.set('port', process.env.PORT || 8081)

app.use(bodyParser.json({limit: '10mb', extended: true}))
app.use(bodyParser.urlencoded( {limit: '10mb',extended: true} ))

app.use('/api', api)
app.use('/api/images', express.static(__dirname + '/uploads/images'));

const mongoose = require('mongoose')

mongoose.connect(process.env.MONGODB_URL, {useUnifiedTopology: true, useNewUrlParser: true, useFindAndModify: false, useCreateIndex: true })

const db = mongoose.connection

db.on('error', console.error.bind(console, 'connection error: '))
db.once('open', () => {
    console.log('connected to mongodb')

    app.listen(app.get('port'), () => {
        console.log(`server listening on port: ${app.get('port')}`)
    })
})