import mongoose from 'mongoose';
import config from '../config.json';

mongoose.Promise = global.Promise;

const options = {
  useMongoClient: true,
};

mongoose.connect(`mongodb://${config.mlabUsername}:${config.mlabPassword}@ds159236-a0.mlab.com:59236,ds159236-a1.mlab.com:59236/sunday-prod?replicaSet=rs-ds159236`, options);

export const db = mongoose.connection;

db.on('error', console.error.bind(console, 'connection error:'));

export default (callback) => {
  callback();
};
