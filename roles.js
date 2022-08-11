const accessControl = require('accesscontrol')

let grantsObject = {
    root: {
        project: {
            'create:any': ['*'],
            'read:any': ['*'],
            'update:any': ['*'],
            'delete:any': ['*'],
        },
        event: {
            'create:any': ['*'],
            'read:any': ['*'],
            'update:any': ['*'],
            'delete:any': ['*'],
        },
        order: {
            'create:any': ['*'],
            'read:any': ['*'],
            'update:any': ['*'],
            'delete:any': ['*'],

        },
        office: {
            'create:any': ['*'],
            'read:any': ['*'],
            'update:any': ['*'],
            'delete:any': ['*'],
        },
        user: {
            'create:any': ['*'],
            'read:any': ['*'],
            'update:any': ['*'],
            'delete:any': ['*'],
        },
        insights: {
            'read:any': ['*']
        },
        join: {
            'read:any': ['*'],
            'delete:any': ['*']
        },
        sponsor: {
            'create:any': ['*'],
            'read:any': ['*'],
            'update:any': ['*'],
            'delete:any': ['*'],
        },
        notification: {
            'create:any': ['*'],
        }
    },
    officeAdmin: {
        project: {
            'read:any': ['*'],
        },
        event: {
            'create:own': ['*'],
            'read:own': ['*'],
            'update:own': ['*'],
            'delete:own': ['*'],
        },
        order: {
            'create:own': ['*'],
            'read:any': ['*'],
            'update:own': ['checkedIn'],
            'delete:own': ['*'],
        },
        office: {
            'read:own': ['*'],
            'update:own': ['vacant', 'tasks'],
        },
        user: {
            'create:own': ['*'],
            'read:any': ['*'],
            'update:any': ['*'],
            'delete:own': ['*'],
        },
        insights: {
            'read:own': ['*']
        },
        join: {
            'read:own': ['*'],
            'delete:own': ['*']
        },
        notification: {
            'create:own': ['*'],
        }
    },
    officeMember: {
        project: {
            'read:any': ['*'],
        },
        event: {
            'read:any': ['*'],
        },
        order: {
            'create:own': ['*'],
            'read:any': ['*'],
            'update:own': ['checkedIn'],
            'delete:own': ['*'],
        },
        office: {
            'read:own': ['*'],
        },
        user: {
            'read:own': ['*'],
            'update:own': ['*', '!role'],
        },
        insights: {
            'read:own': ['*']
        },
    },
    user: {
        project: {
            'read:any': ['*'],
        },
        event: {
            'read:any': ['*'],
        },
        order: {
            'create:own': ['*'],
            'read:own': ['*'],
            'delete:own': ['*']
        },
        user: {
            'create:own': ['*'],
            'read:own': ['*'],
            'update:own': ['*'],
            'delete:own': ['*'],
        }
    },
}

let ac = new accessControl(grantsObject)

module.exports = ac