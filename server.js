//SECTION - 引用模組
const http = require("http");
const { v4: uuidv4 } = require("uuid");
const mongoose = require("mongoose");
const errorHandle = require("./errorHandler");

//NOTE - 給定初始空陣列
const todoListData = [];

require("dotenv").config();

const DATABASE_NAME = "todolist-kata";
const DATABASE =
  process.env.DATABASE + DATABASE_NAME + "?retryWrites=true&w=majority";

mongoose.connect(DATABASE, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

//TODO - 連接DB
mongoose.connection.once("open", () => {
  console.log("MongoDB connection successful");
});

mongoose.connection.on(
  "error",
  console.error.bind(console, "MongoDB connection error:")
);
const todoSchema = new mongoose.Schema({
  title: String,
  uuid: String,
  createAt: { type: Date, default: Date.now },
  updateAt: { type: Date, default: Date.now },
  done: { type: Boolean, default: false },
});

const TodoModel = mongoose.model("Todo", todoSchema);
const requestListener = (req, res) => {
  const headers = {
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, Content-Length, X-Requested-With",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,DELETE,PATCH,OPTIONS",
    "Content-Type": "application/json",
  };

  let bodyData = "";
  req.on("data", (chunk) => {
    bodyData += chunk;
  });

  if (req.url == "/todos" && req.method == "GET") {
    /**SECTION - 取得所有 */
    res.writeHead(200, headers);
    res.write(
      JSON.stringify({
        status: "success",
        message: "取得待辦列表成功",
        data: todoListData,
      })
    );
    res.end();
  } else if (req.url == "/todos" && req.method == "POST") {
    //TODO - 新增Todos

    req.on("end", async () => {
      try {
        const todoTitle = JSON.parse(bodyData).title;
        if (!!todoTitle) {
          const newTodoData = {
            uuid: uuidv4(),
            title: todoTitle,
          };
          todoListData.push(newTodoData);

          // 使用 TodoModel 創建新的待辦事項並保存到資料庫
          const newTodo = new TodoModel(newTodoData);
          const savedTodo = await newTodo.save();

          res.writeHead(200, headers);
          res.end(
            JSON.stringify({
              status: "success",
              message: "新增一筆待辦 成功",
              data: savedTodo, // 返回新增的待辦事項資料
            })
          );
        } else {
          errorHandle(res);
        }
      } catch (error) {
        console.log(error);
        errorHandle(res);
      }
    });
  } else if (req.url.startsWith("/todos/") && req.method == "DELETE") {
    //TODO - 刪除Todos

    const uuid = req.url.split("/").pop();
    // 根据 UUID 查找并删除待办事项
    TodoModel.findOneAndDelete({ uuid: uuid })
      .then((deletedTodo) => {
        if (!deletedTodo) {
          res.writeHead(404, headers);
          res.end(
            JSON.stringify({
              status: "error",
              message: "找不到待辦事項或刪除失敗",
            })
          );
          return;
        }

        res.writeHead(200, headers);
        res.end(
          JSON.stringify({
            status: "success",
            message: "刪除一筆待辦 成功",
            data: deletedTodo,
          })
        );
      })
      .catch((error) => {
        console.error("Error deleting todo:", error);
        res.writeHead(500, headers);
        res.end(
          JSON.stringify({
            status: "error",
            message: "刪除待辦事項時發生錯誤",
          })
        );
      });
  } else if (req.url.startsWith("/todos/") && req.method == "PATCH") {
    //TODO - 修改Todos

    const uuid = req.url.split("/")[2]; // Extract UUID from URL
    req.on("end", async () => {
      try {
        const editTitle = JSON.parse(bodyData).title;
        // 找到對應 UUID 的待辦事項並更新標題
        const updatedTodo = await TodoModel.findOneAndUpdate(
          { uuid: uuid }, // 搜尋條件
          { title: editTitle }, // 更新的資料
          { new: true } // 返回更新後的資料
        );
        if (!updatedTodo) {
          res.writeHead(404, headers);
          res.end(
            JSON.stringify({
              status: "error",
              message: "找不到待辦事項或更新失敗",
            })
          );
          return;
        }
        res.writeHead(200, headers);
        res.end(
          JSON.stringify({
            status: "success",
            message: "編輯一筆待辦 成功",
            data: updatedTodo,
          })
        );
      } catch (error) {
        console.log(error);
        errorHandle(res);
      }
    });
  } else if (req.url == "/todos/count" && req.method == "GET") {
    //TODO - 查詢資料庫Todos數量

    TodoModel.countDocuments()
      .then((count) => {
        res.writeHead(200, headers);
        res.end(
          JSON.stringify({
            status: "success",
            message: "取得待辦事項總數成功",
            count: count,
          })
        );
      })
      .catch((error) => {
        console.error("Error counting todos:", error);
        res.writeHead(500, headers);
        res.end(
          JSON.stringify({
            status: "error",
            message: "無法取得待辦事項總數",
          })
        );
      });
  } else if (req.method == "OPTIONS") {
    res.writeHead(200, headers);
    res.end();
  } else if (req.url.startsWith("/todos?page=") && req.method == "GET") {
    //TODO - 依據頁數得到列表
    const params = new URLSearchParams(req.url.split("?")[1]);
    const pageNumber = parseInt(params.get("page"));
    const limit = parseInt(params.get("limit"));
    const orderByColumn = params.get("orderByColumn");
    const orderByAsc = params.get("orderByAsc");
    const skipCount = (pageNumber - 1) * limit;

    const sortOptions = {};
    if (orderByColumn && orderByAsc) {
      sortOptions[orderByColumn] = orderByAsc === "true" ? 1 : -1;
    }

    TodoModel.find()
      .skip(skipCount)
      .limit(limit)
      .sort(sortOptions)
      .exec()
      .then((todos) => {
        res.writeHead(200, headers);
        res.end(
          JSON.stringify({
            status: "success",
            message: `取得第 ${pageNumber} 頁待辦事項成功`,
            data: todos,
          })
        );
      })
      .catch((err) => {
        console.error("Error fetching todos:", err);
        res.writeHead(500, headers);
        res.end(
          JSON.stringify({
            status: "error",
            message: "無法從資料庫獲取待辦事項",
          })
        );
      });
  } else if (req.url == "/todos" && req.method == "DELETE") {
    //TODO Delete all todos
    console.log("刪除全部");
    TodoModel.deleteMany({})
      .then(() => {
        res.writeHead(200, headers);
        res.end(
          JSON.stringify({
            status: "success",
            message: "所有待辦事項已成功刪除",
          })
        );
      })
      .catch((error) => {
        console.error("Error deleting all todos:", error);
        res.writeHead(500, headers);
        res.end(
          JSON.stringify({
            status: "error",
            message: "刪除所有待辦事項時發生錯誤",
          })
        );
      });
  } else {
    res.writeHead(404, headers);
    res.write(
      JSON.stringify({
        status: "false",
        message: "路由錯誤",
      })
    );
    res.end();
  }
};

const server = http.createServer(requestListener);
server.listen(process.env.PORT || 3005);
