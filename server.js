const http = require("http");
const { v4: uuidv4 } = require("uuid");
const errorHandle = require("./errorHandler");
const todoListData = [];

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
    req.on("end", () => {
      try {
        const todoTitle = JSON.parse(bodyData).title;
        if (!!todoTitle) {
          const newTodoData = {
            title: todoTitle,
            uuid: uuidv4(),
          };
          todoListData.push(newTodoData);

          res.writeHead(200, headers);
          res.write(
            JSON.stringify({
              status: "success",
              message: "新增一筆待辦 成功",
              data: todoListData,
            })
          );
          res.end();
        } else {
          errorHandle(res);
        }
      } catch (error) {
        console.log(error);
        errorHandle(res);
      }
    });
  } else if (req.url == "/todos" && req.method == "DELETE") {
    todoListData.length = 0;
    res.writeHead(200, headers);
    res.write(
      JSON.stringify({
        status: "success",
        message: "刪除所有待辦 成功",
        data: todoListData,
      })
    );
    res.end();
  } else if (req.url.startsWith("/todos/") && req.method == "DELETE") {
    const uuid = req.url.split("/").pop();
    const todoIndex = todoListData.findIndex((element) => element.uuid == uuid);
    if (todoIndex > -1) {
      todoListData.splice(todoIndex, 1);
      res.writeHead(200, headers);
      res.write(
        JSON.stringify({
          status: "success",
          message: "刪除一筆待辦 成功",
          data: todoListData,
        })
      );
      res.end();
    } else {
      errorHandle(res);
    }
  } else if (req.url.startsWith("/todos/") && req.method == "PATCH") {
    req.on("end", () => {
      try {
        const editTitle = JSON.parse(bodyData).title;
        const uuid = req.url.split("/").pop();
        const todoIndex = todoListData.findIndex(
          (element) => element.uuid == uuid
        );
        if (!!editTitle && todoIndex > -1) {
          todoListData[todoIndex].title = editTitle;
          res.writeHead(200, headers);
          res.write(
            JSON.stringify({
              status: "success",
              message: "編輯一筆待辦 成功",
              data: todoListData,
            })
          );
          res.end();
        } else {
          errorHandle(res);
        }
        res.end();
      } catch (error) {
        console.log(error);

        errorHandle(res);
      }
    });
  } else if (req.method == "OPTIONS") {
    res.writeHead(200, headers);
    res.end();
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
