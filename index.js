import express from "express"
import dotenv from "dotenv"
import pg from "pg"
import axios from "axios"

dotenv.config();

const app = express();
const port = 3000;

const db = new pg.Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: Number(process.env.PGPORT),
});

try {
  await db.query("SELECT 1");
} catch(err) {
  console.error("Database connection failed: ", err.message);
}

app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

async function findCover(isbn, title, author) {
    const searches = [];
    if (isbn) {
        searches.push({q: `isbn:${isbn}`});
    }
    if (title) {
        searches.push({q: title, author});
    }
    for (const search of searches) {
        try {
            const response = await axios.get(
                "https://openlibrary.org/search.json",
                {
                    params: {
                        ...search,
                        fields: "title,cover_i",
                        limit: 5
                    },
                    timeout: 10000
                }
            );
            const match = response.data.docs.find((book) => book.cover_i);
            if (match) {
                return match.cover_i;
            }
        } catch(err) {
            console.error("Cover lookup failed.", err.message);
        }
    }
    return null;
}

app.get("/", async (req, res) => {
  const sortOptions = {
    rating: "rating DESC NULLS LAST, title ASC",
    recency: "date_read DESC NULLS LAST, title ASC",
    title: "title ASC"
  };
  const sort = Object.hasOwn(sortOptions, req.query.sort)
    ? req.query.sort
    : "recency";
  try {
    const result = await db.query(`SELECT * FROM books ORDER BY ${sortOptions[sort]}`);
    res.render("index.ejs", {books: result.rows, sort});
  } catch(err) {
    console.error(err.message);
    res.status(500).send("Unable to load books. Please try again.");
  }
});

app.get("/books/:id", async (req, res) => {
    try {
        const result = await db.query (
            "SELECT * FROM books WHERE id = $1",
            [req.params.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).send("Book not found.");
        }
        res.render("book.ejs", { book: result.rows[0]});

    } catch(err) {
        console.log(err);
        res.status(500).send("Unable to load the book.")
    }
});

app.post("/add-book", async(req, res) => {
    const { title, author, isbn, notes, rating, date_read} = req.body;
    try {
        const cover_id = await findCover(isbn, title, author);  
        await db.query(
            `INSERT INTO books (title, author, isbn, notes, rating, date_read, cover_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [title, author, isbn || null, notes, rating, date_read, cover_id]
        );
        res.redirect("/");  
    } catch(err) {
        console.error(err.message);
        res.status(500).send("Unable to save the book. Please try again.");
    }
});

app.post("/books/:id/edit", async (req, res) => {
    const {title, author, isbn, notes, rating, date_read} = req.body;

    try {
        const cover_id = await findCover(isbn, title, author);
        const result = await db.query(
            `UPDATE books SET title = $1, author = $2, isbn = $3, notes = $4, rating = $5, date_read = $6, cover_id = $7 WHERE id = $8 RETURNING id`,
            [title, author, isbn || null, notes, rating, date_read, cover_id || null, req.params.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).send("Book not found");
        }
        res.redirect(`/books/${req.params.id}`)
    } catch(err) {
        console.error(err.message);
        res.status(500).send("Unable to update the book.");
    }
});

app.post("/books/:id/delete", async (req, res) => {
    try {
        const result = await db.query(
            "DELETE FROM books WHERE id = $1 RETURNING id",
            [req.params.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).send("Book not found");
        }
        res.redirect("/");
    } catch(err) {
        console.error(err.message);
        res.status(500).send("Unable to delete the book.");
    }
});

app.get("/find-cover", async (req, res) => {
    const {isbn,title,author} = req.query;
    if (!isbn && !title) {
        return res.status(400).send("Please provide an ISBN or a title.");
    }
    const coverId = await findCover(isbn, title, author);
    res.json({coverId});
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 