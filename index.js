const express = require('express');
const { graphqlHTTP } = require('express-graphql');
const { buildSchema } = require('graphql');

// Schéma GraphQL
const schema = buildSchema(`
  type Query {
    user(id: ID!): User
    users: [User]
    post(id: ID!): Post
    posts: [Post]
  }

  type Mutation {
    addUser(name: String!, email: String!): User
    addPost(title: String!, content: String!, authorId: ID!): Post
    likePost(postId: ID!, userId: ID!): Post
    addComment(postId: ID!, userId: ID!, content: String!): Comment
    followUser(followerId: ID!, followingId: ID!): User
  }

  type User {
    id: ID!
    name: String!
    email: String!
    posts: [Post]
    followers: [User]
    following: [User]
  }

  type Post {
    id: ID!
    title: String!
    content: String!
    author: User!
    likes: [User]
    comments: [Comment]
  }

  type Comment {
    id: ID!
    content: String!
    author: User!
  }
`);

// Données simulées
const users = [
  { id: "0", name: 'Alice', email: 'alice@example.com', followers: [], following: [] },
  { id: "1", name: 'Bob', email: 'bob@example.com', followers: [], following: [] },
];

const posts = [
  { id: "0", title: 'First Post', content: 'Hello World', author: "0", likes: [], comments: [] },
];

const comments = [];

// Résolveurs
const root = {
  // Queries
  user: ({ id }) => {
    const user = users.find(user => user.id === id);
    if (user) {
      user.posts = posts.filter(post => post.author === user.id);
      user.followers = users.filter(u => u.following.includes(user.id));
      user.following = users.filter(u => user.following.includes(u.id));
    }
    return user;
  },

  users: () => {
    return users.map(user => ({
      ...user,
      posts: posts.filter(post => post.author === user.id),
      followers: users.filter(u => u.following.includes(user.id)),
      following: users.filter(u => user.following.includes(u.id)),
    }));
  },

  post: ({ id }) => {
    const post = posts.find(post => post.id === id);
    if (post) {
      post.author = users.find(user => user.id === post.author);
      post.likes = post.likes.map(userId => users.find(user => user.id === userId));
      post.comments = post.comments.map(commentId => comments.find(comment => comment.id === commentId));
    }
    return post;
  },

  posts: () => {
    return posts.map(post => ({
      ...post,
      author: users.find(user => user.id === post.author),
      likes: post.likes.map(userId => users.find(user => user.id === userId)),
      comments: post.comments.map(commentId => comments.find(comment => comment.id === commentId)),
    }));
  },

  // Mutations
  addUser: ({ name, email }) => {
    const newUser = { id: String(users.length), name, email, followers: [], following: [] };
    users.push(newUser);
    return newUser;
  },

  addPost: ({ title, content, authorId }) => {
    const newPost = { id: String(posts.length), title, content, author: authorId, likes: [], comments: [] };
    posts.push(newPost);
    return { ...newPost, author: users.find(user => user.id === authorId) };
  },

  likePost: ({ postId, userId }) => {
    const post = posts.find(post => post.id === postId);
    if (post && !post.likes.includes(userId)) {
      post.likes.push(userId);
    }
    return {
      ...post,
      author: users.find(user => user.id === post.author),
      likes: post.likes.map(userId => users.find(user => user.id === userId)),
    };
  },

  addComment: ({ postId, userId, content }) => {
    const newComment = { id: String(comments.length), content, author: userId };
    comments.push(newComment);
    const post = posts.find(post => post.id === postId);
    if (post) {
      post.comments.push(newComment.id);
    }
    return { ...newComment, author: users.find(user => user.id === userId) };
  },

  followUser: ({ followerId, followingId }) => {
    const follower = users.find(user => user.id === followerId);
    const following = users.find(user => user.id === followingId);
    if (follower && following && !follower.following.includes(followingId)) {
      follower.following.push(followingId);
      following.followers.push(followerId);
    }
    return {
      ...follower,
      following: users.filter(user => follower.following.includes(user.id)),
      followers: users.filter(user => user.following.includes(follower.id)),
    };
  },
};

// Création du serveur Express
const app = express();
app.use('/graphql', graphqlHTTP({
  schema: schema,
  rootValue: root,
  graphiql: true,
}));

// Lancement du serveur
app.listen(4000, () => console.log('Serveur GraphQL lancé sur http://localhost:4000/graphql'));
