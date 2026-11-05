'use strict';

const { readState, writeState } = require('./logfit-bridge');
const { handleTelegramResponse } = require('./logfit-response');

const input = JSON.parse(process.argv[2] || '{}');
const state = readState();
const result = handleTelegramResponse(input.text || '', state, input.now ? new Date(input.now) : new Date(), {
  weatherNotification: input.weather_notification || null,
  merge_weather: true,
  registerCron: (item) => input.cron_job_id || null,
  pending_id: input.pending_id || null,
  chat_id: input.chat_id || null
});
if (result.status !== 'no_pending' && result.status !== 'duplicate') writeState(result.state);
process.stdout.write(JSON.stringify({ status: result.status, message: result.message, merged: Boolean(result.merged), state: result.state }) + '\n');
