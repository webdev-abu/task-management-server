const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, Db, ObjectId } = require("mongodb");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
// const jwt = require("jsonwebtoken");
require("dotenv").config();

const port = process.env.PORT || 5000;
const app = express();

// middleware
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://tutor-booking-43ee8.web.app",
      "https://tutor-booking-43ee8.firebaseapp.com/",
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// User verification middleware
const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;

  // console.log("Token inside the verifyToken middleware", token);

  if (!token) {
    return res.status(401).send({ message: "Unauthorized Access !" });
  }

  // Verify token
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "Unauthorized Access !" });
    }
    req.user = decoded;
    next();
  });
};

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@nabenducluster.rpwkxww.mongodb.net/?retryWrites=true&w=majority&appName=NabenduCluster`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const bd = client.db("E-TutorDB");
    const tutorsCollection = bd.collection("tutorials");
    const bookCollection = bd.collection("booked-tutor");

    // auth related api
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "5h",
      });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ success: true });
    });

    app.post("/logout", (req, res) => {
      res
        .clearCookie("token", {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ success: true });
    });

    // Save a tutorsData in DB
    app.post("/add-tutorial", async (req, res) => {
      const tutorData = req.body;
      console.log(tutorData);
      const result = await tutorsCollection.insertOne(tutorData);
      res.send(result);
    });

    app.get("/my-tutorials/:email", async (req, res) => {
      const userEmail = req.params.email;
      const query = { email: userEmail };

      const result = await tutorsCollection.find(query).toArray();
      res.send(result);
    });

    // get all tutors from db
    app.get("/tutors", async (req, res) => {
      const result = await tutorsCollection.find().toArray();
      res.send(result);
    });

    app.get("/tutors/category", async (req, res) => {
      // const category = req.query.category;
      const query = tutorsCollection.find().limit(9);
      const result = await query.toArray();
      res.send(result);
    });

    // get all tutors posted by a specific category tutors from db
    app.get("/find-tutors/:category", async (req, res) => {
      const category = req.params.category;

      const query = { category: category };
      const result = await tutorsCollection.find(query).toArray();
      res.send(result);
    });

    //  get a single tutor from tutors collection
    app.get("/tutor-detail/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await tutorsCollection.findOne(query);

      res.send(result);
    });

    // Book Tutorial with New Book Collection
    app.post("/booked-tutorial", async (req, res) => {
      const bookData = req.body;
      const result = await bookCollection.insertOne(bookData);
      res.send(result);
    });

    // get all booked posted by a specific user from db
    app.get("/booked-tutorial/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      const query = { user_email: email };
      const result = await bookCollection.find(query).toArray();
      res.send(result);
    });

    app.patch("/update-review/:tutorId", async (req, res) => {
      const tutorId = req.params.tutorId;
      console.log(tutorId);
      const query = { _id: new ObjectId(tutorId) };
      const options = { upsert: false };
      const updateDoc = {
        $inc: { reviews: 1 },
      };
      const result = await tutorsCollection.updateOne(
        query,
        updateDoc,
        options
      );
      res.send(result);
    });

    // Delete tutor from tutors collection
    app.delete("/delete-tutorial/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await tutorsCollection.deleteOne(query);
      res.send(result);
    });

    // updated tutors collection
    app.put("/update-tutorials/:id", async (req, res) => {
      const tutorsData = req.body;
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updateTutors = {
        $set: tutorsData,
      };
      const options = { upsert: true };
      const result = await tutorsCollection.updateOne(
        query,
        updateTutors,
        options
      );
      res.send(result);
    });

    app.get("/find-tutors", async (req, res) => {
      try {
        const { languages } = req.query;
        const query = languages
          ? { languages: { $regex: languages, $options: "i" } }
          : {};
        const tutors = await tutorsCollection.find(query).toArray();
        res.send(tutors);
      } catch (error) {
        res.status(500).json({ message: "Error fetching tutors" });
      }
    });
  } finally {
    // Ensures that the client will close when you finish/error
  }
}
run().catch(console.dir);
app.get("/", (req, res) => {
  res.send("Hello from E-Tutor Server....");
});

app.listen(port, () => console.log(`Server running on port ${port}`));
