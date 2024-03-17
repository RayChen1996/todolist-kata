export const Todos = {
  title: String,
  uuid: String,
};

export const todoSchema = new mongoose.Schema({
  title: String,
  uuid: String,
});
