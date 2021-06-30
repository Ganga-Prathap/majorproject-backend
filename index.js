const express = require("express");
const {open} = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "eCommerce.db");
let db = null;

const InitializeDBandServer = async(request, response) => {
    try {
        db = await open({
            filename: dbPath,
            driver: sqlite3.Database,
        });
        app.listen(8000, () => {
            console.log("Server is starting...");
        });
    }
    catch(e){
        console.log(`DB Error : ${e.message}`);
        process.exit(1);
    }
};

InitializeDBandServer();

// user registration

app.post("/register/", async(request, response) => {

    const {username, password} = request.body;

    const getUserQuery = `
        SELECT * FROM user WHERE username = '${username}';
    `;

    const dbUser = await db.get(getUserQuery);

    if(dbUser === undefined){
        const hashedPassword = await bcrypt.hash(password, 10);

        const addUserQuery = `
            INSERT INTO user(username, password)
            VALUES('${username}', '${hashedPassword}');
        `;

        const dbResponse = await db.run(addUserQuery);
        response.status(201);
        response.send("New User Created");
    }
    else {
        response.status(400);
        response.send("Invalid username");
    }

})


// user login

app.post("/login/", async(request, response) => {
    
    const {username, password} = request.body;

    const getUserQuery = `
        SELECT * FROM user WHERE username = '${username}';
    `;

    const dbUser = await db.get(getUserQuery);

    if(dbUser === undefined){
        response.status(400);
        response.send("Invalid user");
    }
    else {
        const isPasswordTrue = await bcrypt.compare(password, dbUser.password);

        if(isPasswordTrue){
            const payload = {username: username};
            const jwtToken = jwt.sign(payload, "Secret_Key");
            response.send({jwtToken});
        }
        else {
            response.status(400);
            response.send("Invalid password");
        }
    }
})


// authenticateToken as middleware function

const authenticateToken = (request, response, next) => {
    let jwtToken;
    const authHeader = request.headers["authorization"];

    if(authHeader !== undefined){
        jwtToken = authHeader.split()[1];
    }
    
    if(jwtToken === undefined){
        response.status(401);
        response.send("Invalid JWT Token")
    }
    else {
        jwt.verify(jwtToken, "Secret_Key", async (error, payload)=> {
            if(error){
                response.status(401);
                response.send("Invalid JWT Token");
            }
            else {
                request.username = payload.username;
                next();
            }
        })
    }
}

// get products

app.get("/products/", authenticateToken, async(request, response) => {
    const getProductsDetailsQuery = `
        SELECT * FROM produt;
    `;
    const products = await db.all(getProductsDetailsQuery);
    response.send(products);
})

module.exports = app;