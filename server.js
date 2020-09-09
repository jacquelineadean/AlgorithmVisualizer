const express = require("express");
const app = express();
const PORT = process.env.PORT || 3001;

// Serve static assets
if (process.env.NODE_ENV === 'production') {
    app.use(express.static('client/build'));
}

app.use("/client", express.static(__dirname + "/client"))

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/client/public/index.html");
})

app.listen(PORT, function() {
    console.log(`🌎  ==> API Server now listening on PORT ${PORT}!`);
});