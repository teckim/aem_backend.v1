const router = require('express').Router()

require('./routes/users')(router)
require('./routes/images')(router)
require('./routes/events')(router)
require('./routes/offices')(router)
require('./routes/orders')(router)
require('./routes/joins')(router)
require('./routes/members')(router)
require('./routes/projects')(router)
require('./routes/sponsors')(router)
require('./routes/notify')(router)
require('./routes/insights')(router)

// require('./routes/login')(router)
// require('./routes/verify')(router)

require('./routes/tests')(router)
module.exports = router