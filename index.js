'use strict'

const _ = require('lodash')
const async = require('async')

const Driver = require('mongodb')
const { MongoClient, ObjectID } = Driver

const Base = require('bfx-facs-base')
const fmt = require('util').format

function client (conf, opts, cb) {
  // Avoid [MongoError: password cannot be empty] when password is not set.
  const userAndPass = (conf.user && conf.password) ? `${conf.user}:${conf.password}@` : ''
  let url = (opts.mongoUri)
    ? opts.mongoUri
    : fmt(
      'mongodb://%s%s:%s/%s?authMechanism=DEFAULT&maxPoolSize=' + (conf.maxPoolSize || 150),
      userAndPass, conf.host, conf.port, conf.database
    )

  if (conf.rs && !opts.mongoUri) {
    url += `&replicaSet=${conf.rs}`
  }

  MongoClient.connect(url, cb)
}

class MongoFacility extends Base {
  constructor (caller, opts, ctx) {
    super(caller, opts, ctx)

    this.name = 'db-mongo'
    this._hasConf = true

    this.init()
  }

  getDriver () {
    return Driver
  }

  getObjectID (id) {
    return new ObjectID(id)
  }

  _start (cb) {
    async.series([
      next => { super._start(next) },
      next => {
        client(_.pick(
          this.conf,
          ['user', 'password', 'database', 'host', 'port', 'rs', 'maxPoolSize']
        ), this.opts, (err, cli) => {
          if (err) return next(err)

          this.cli = cli
          this.db = cli.db(this.conf.database)
          next()
        })
      }
    ], cb)
  }

  _stop (cb) {
    async.series([
      next => { super._stop(next) },
      next => {
        this.cli.close()
        delete this.cli
        delete this.db
        next()
      }
    ], cb)
  }
}

module.exports = MongoFacility
