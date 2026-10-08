require('dotenv').config();
const { app, logger } = require('./app');

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  logger.info(`Server listening on port ${PORT}`);
});
