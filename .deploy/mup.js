module.exports = {
  servers: {
    one: {
      host: 'calcmc.educationetc.org',
      username: 'jkalodner',
      // pem:
      password: 'Password1'
      // or leave blank for authenticate from ssh-agent
    }
  },

  meteor: {
    name: 'image-mc',
    path: '.',
    dockerImage: 'abernix/meteord:base',
    servers: {
      one: {}
    },
    buildOptions: {
      serverOnly: true,
      debug: true
    },
    env: {
      ROOT_URL: 'http://calcmc.educationetc.org',
      MONGO_URL: 'mongodb://localhost/meteor'
    },

    //dockerImage: 'kadirahq/meteord'
    deployCheckWaitTime: 60
  },

  mongo: {
    oplog: true,
    port: 27017,
    servers: {
      one: {},
    },
  },
};
