const express = require('express')
const app = express()

app.static('/', express.static('public'))

app.listen(14141, () => console.log('Server running on port 14141'))