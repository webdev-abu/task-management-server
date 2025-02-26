const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
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
      "https://task-management-7695a.web.app",
      "https://task-management-7695a.firebaseapp.com",
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
    const bd = client.db("task-managementDB");
    const usersCollection = bd.collection("users");
    const tasksCollection = bd.collection("tasks");

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

    // Save or Update a user to the database
    app.post("/users/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = req.body;
      // check if user is already in the database
      const existingUser = await usersCollection.findOne(query);
      if (existingUser) {
        //  user if they already exist
        return res.send(existingUser);
      }
      const result = await usersCollection.insertOne({
        ...user,
      });
      res.send(result);
    });

    // ✅ GET all tasks
    app.get("/tasks", async (req, res) => {
      try {
        const tasks = await tasksCollection.find().sort({ order: 1 }).toArray();
        res.send(tasks);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Error fetching tasks" });
      }
    });

    // ✅ POST: Add a new task
    app.post("/tasks", async (req, res) => {
      try {
        const { title, description, category } = req.body;
        const newTask = {
          title,
          description: description || "",
          category: category || "To-Do",
          timestamp: new Date(),
          order: Date.now(),
        };
        const result = await tasksCollection.insertOne(newTask);
        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Error adding task" });
      }
    });

    // ✅ PUT: Update an existing task
    app.put("/tasks/edit/:id", async (req, res) => {
      const tasks = req.body.tasks;
      const id = req.params.id;
      const result = await tasksCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { tasks } }
      );
      res.send(result);
    });
    app.put("/tasks/:id", async (req, res) => {
      const tasks = req.body.category;
      const id = req.params.id;
      const result = await tasksCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { category: tasks } }
      );
      res.send(result);
    });

    // ✅ DELETE: Remove a task
    app.delete("/tasks/:id", async (req, res) => {
      try {
        const { id } = req.params;
        console.log(id);
        const result = await tasksCollection.deleteOne({
          _id: new ObjectId(id),
        });
        if (result.deletedCount === 0)
          return res.status(404).send({ error: "Task not found" });
        res.send({ message: "Task deleted" });
      } catch (error) {
        res.status(500).send({ error: "Failed to delete task" });
      }
    });

    // ✅ PUT: Reorder tasks
    app.put("/tasks/reorder", async (req, res) => {
      const { tasks } = req.body;
      const result = await tasksCollection.updateMany({}, { tasks });
      res.send(result);
    });
  } finally {
    // Ensures that the client will close when you finish/error
  }
}
run().catch(console.dir);
app.get("/", (req, res) => {
  res.send("Hello from Task Management Server....");
});

app.listen(port, () => console.log(`Server running on port ${port}`));
