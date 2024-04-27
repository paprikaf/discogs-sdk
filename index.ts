import axios, { AxiosRequestConfig } from 'axios';
import express, { Request, Response } from 'express';
import qs from 'qs';
import crypto from 'crypto';
import fs from 'fs';
import * as types from './lib/types'


const app = express();
const port = 3000;

// Serve the static HTML file from the example folder
app.use(express.static('example'));

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });

  require('dotenv').config();

