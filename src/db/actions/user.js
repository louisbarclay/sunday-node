/* eslint-disable prefer-const */
/* eslint-disable no-underscore-dangle */
/* eslint-disable import/prefer-default-export */
import { Router } from 'express';
import Joi from 'joi';
import moment from 'moment';
import mongoose from 'mongoose';
import bodyParser from 'body-parser';
import User from '../models/user';
import Story from '../models/story';
import log from '../../log';
import config from '../../config.json';
import MailService from '../../api/testMailService';

mongoose.Promise = require('bluebird');

const schema = Joi.object().keys({
  email: Joi.string().email().lowercase().required(),
});

export default ({ config, db }) => {
  const userRouter = Router();
  userRouter.use(bodyParser.json());
  userRouter.route('/')
  .get((req, res, next) => {
    User.find({})
    .then((users) => {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.json(users);
    }, err => next(err))
    .catch(err => next(err));
  })
  .post((req, res, next) => {
    // Still configure lastSentSunday and referredBy, unless handled by already made app. Probably not referred by.
    let userId = '';
    User.findOne({ email: req.body.email })
    .then(async (user) => {
      try {
        if (user === null) {
          const jobQueries = [];
          req.body.timeCreated = moment().format();
          req.body.writerIds = [];
          try {
            // const listOfJobs = await Promise.all(jobQueries);
            jobQueries.push(
              User.create(req.body)
              .then((user2) => {
                userId = user2._id;
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.json(user2);
              }, err => next(err)),
            );
          } catch (error) {
            res.status(500).send('one of the queries failed', error);
          }
          // So if a user has a writerIds field, it's an array with the Object ID of a user they are receiving stories from, not sending stories to
          // Reconfigure API to account for this.
          // Gonna have to create user 1st I believe, or do a promise create.
          await Promise.all(jobQueries);
          req.body.recipients.forEach((i) => {
            User.findOne({ email: i })
            .then((user1) => {
              if (user1 !== null) {
                // Make it so only one email per person though, so not duplicate emails,
                // else this might be bypassable below
                // User.findOne({ email: req.body.recipients[0] });
                req.body.writerIds.push(userId);
              } else if (user1 === null) {
                User.create({ email: i, writerIds: [userId], timeCreated: moment().format() })
                .then((recipUser) => {
                  req.body.writerIds.push(userId);
                });
              } else {
              }
            });
          });
        } else {
          res.status(400).send('User already registered, can\'t send 2 stories');
        }
      } catch (error) {
        res.status(500).send('something failed', error);
      }
    });
  })
  .put((req, res, next) => {
    res.statusCode = 403;
    res.end('PUT operation not supported on /users');
  })
  .delete((req, res, next) => {
    User.remove()
    .then((resp) => {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.json(resp);
    }, err => next(err))
    .catch(err => next(err));
  });

  // -----userId-----
  // WriterIds auto made.

  userRouter.route('/:userId')
  .get((req, res, next) => {
    User.findById(req.params.userId)
    .then((user) => {
      if (user !== null) {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.json(user);
      } else {
        const err = new Error(`User ${req.params.userId} not found`);
        err.status = 404;
        return next(err);
      }
    }, err => next(err))
    .catch(err => next(err));
  })
  .post((req, res, next) => {
    res.statusCode = 403;
    res.end(`Post operation not supported on /users/${req.params.userId}`);
  })
  .put((req, res, next) => {
    let userId = '';
    let promise = [];
    let usersRecipients = req.body.recipients;
    // Maybe reformat whole thing
    User.findById(req.params.userId)
    .then(async (user) => {
      if (user !== null) {
        userId = user._id.toHexString();
        promise = usersRecipients.map((item) => {
          User.findOne({ email: item })
          .then(async (users) => {
            if (users !== null) {
              if (users.writerIds.indexOf(userId) === -1) {
                users.writerIds.push(userId);
                await users.save();
              } else {
                // Recipient user already has that user as a writer
              }
              // TODO: Fix
              // Cause of an set header error
            } else {
              User.create({ email: item, writerIds: userId })
              .then((user2) => {
              })
              .catch(err => next(err));
            }
          });
        });
        await Promise.all(promise);
        User.findByIdAndUpdate(req.params.userId, {
          $set: req.body,
        }, { new: true })
        .then((user1) => {
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.json(user1);
        }, err => next(err))
        .catch(err => next(err));
      } else {
        res.status(400).send('User not found');
      }
    });
    // Feel like this .then can be formatted to not give err maybe
  })
  .delete((req, res, next) => {
    // Problem is, I wanted to confirm account deletion by email, but you cannot call a method from a link, however, by default it's a get so the easiest way to do it was 
    // to change the delete of /users/:userId to the get of /users/:userId/delete
  })
  .patch((req, res, next) => {
    MailService.create({
      from: '"Sunday" <write@sundaystori.es>', // sender address
      to: req.body.email, // list of receivers
      subject: 'Confirm Deletion', // Subject line
      html: `
      <h1 style="font-size:45px;font-family: 'Times New Roman', Times, serif;padding:15px; text-align:center;">Sunday Stories</h1>
      <h2 style="color:#272728; text-align:center;font-family:Roboto,RobotoDraft,Helvetica,Arial,sans-serif;">Confirm the deletion of your account by clicking this link:</h2>
      <p style="margin-top:0;margin-bottom:20px;text-align:center; font-family:Roboto,RobotoDraft,Helvetica,Arial,sans-serif;">
      <a target="_blank" style="color:#ffffff;text-decoration:none;display:inline-block;height:38px;line-height:38px;padding-top:0;padding-right:24px;padding-bottom:0;padding-left:24px;border:0;outline:0;background-color:#272728;font-size:14px;font-style:normal;font-weight:400;text-align:center;white-space:nowrap;border-radius:4px;margin-top:35px;margin-bottom:35px" href="${config.host}/user/${req.params.userId}/delete">Delete Your Account</a></p>
      <div style="text-align: center; color:#272728;"><p style="color:#272728; text-align:center;font-family:Roboto,RobotoDraft,Helvetica,Arial,sans-serif;font-size: 15px;">If the above button isn't working, you can click or copy this url and paste it into your browser:<br><a style="text-decoration:none; color:#272728" href="${config.host}/user/${req.params.userId}/delete">${config.host}/user/${req.params.userId}/delete"</a></p>
      <p style="font-size:0px;font-family:Roboto,RobotoDraft,Helvetica,Arial,sans-serif;">String.fromCharCode(Math.floor(Math.random()*100), Math.floor(Math.random()*100), Math.floor(Math.random()*100), Math.floor(Math.random()*100))</p><div>
      `,
    });
  });

  userRouter.route('/:userId/delete')
  .get((req, res, next) => {
    let promise = [];
    User.findByIdAndRemove(req.params.userId)
    .then(async (response) => {
      if (response !== null) {
        promise = Story.find({ idOfCreator: req.params.userId })
        .map((story) => {
          if (story !== null) {
            Story.findByIdAndRemove(story._id);
          }
        });
        await Promise.all(promise)
        .then((resp) => {
          if (resp !== null) {
            Story.findByIdAndRemove(req.params.storyId)
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.json({});
          } else {
            res.status(400).send('Story not found');
          }
        }, err => next(err))
        .catch(err => next(err));
      }
    });
  });

  // -----userid/writeIds-----

  userRouter.route('/:userId/writerIds')
  .get((req, res, next) => {
    User.findById(req.params.userId)
    .then((user) => {
      if (user !== null) {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.json(user.writerIds);
      } else {
        const err = new Error(`User + ${req.params.userId} + ' not found`);
        err.statusCode = 404;
        return next(err);
      }
    }, err => next(err))
    .catch(err => next(err));
  })
  .patch((req, res, next) => {
    User.findById(req.params.userId)
    .then((user) => {
      if (user !== null) {
        req.body.writerIds = [];
        req.body.recipients.map((recip) => {
          User.find({ email: recip }, '_id')
          .then((recipUser) => {
            if (recipUser !== null && recipUser.length > 0) {
              // If user is found, push their id into writerIds
              req.body.writerIds.push(recipUser[0]._id);
              // Push user to writerId
            } else {
              // If user is not found - create user and then push to writerId
              User.create({ email: recip, timeCreated: moment().format() })
              .then((newRecipUser) => {
                req.body.writerIds.push(newRecipUser._id);
              });
            }
          }).catch((err) => {
            res.status(400).send('one of the queries failed', err);
            return next(err);
          });
        });
        setTimeout(() => {
          User.findByIdAndUpdate(req.params.userId, {
            $set: req.body,
          }, { new: true })
          .then(() => {
            if (user !== null) {
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.json(user.writerIds);
            } else {
              res.status(400).send('User not found');
            }
          });
        }, req.body.recipients.length * 600);
      } else {
        const err = new Error(`User + ${req.params.userId} + ' not found`);
        err.statusCode = 404;
        return next(err);
      }
    }, err => next(err))
    .catch(err => next(err));
  })
  .put((req, res, next) => {
    res.statusCode = 403;
    res.end(`PUT operation not supported on /users/${req.params.userId}/writerIds`);
  });
  userRouter.route('/:userId/writerIds/:writerId')
  .get((req, res, next) => {
    User.findById(req.params.userId)
    .then((user) => {
      if (user !== null && User.findById(req.params.writerId) !== null) {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.json(req.params.writerId);
        // res.json(user.writerIds.id(req.params.writerId));
      } else {
        const err = new Error(`User + ${req.params.userId} + ' not found`);
        err.statusCode = 404;
        return next(err);
      }
    }, err => next(err))
    .catch(err => next(err));
  });

  return userRouter;
};

export const deleteAllUsers = () => {
  if (config.dev) {
    User.remove({}, (err) => {
      if (err) {
        return log.info(err);
      }
    });
  } else {
    log.info('Cannot delete all users unless in dev mode');
  }
};

/* eslint-enable import/prefer-default-export */
