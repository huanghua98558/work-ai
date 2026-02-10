-- 创建 user_robots 表
-- 用于管理用户绑定的机器人

CREATE TABLE IF NOT EXISTS user_robots (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  robot_id VARCHAR(255) NOT NULL REFERENCES robots(bot_id) ON DELETE CASCADE,
  nickname VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, robot_id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_user_robots_user_id ON user_robots(user_id);
CREATE INDEX IF NOT EXISTS idx_user_robots_robot_id ON user_robots(robot_id);

-- 添加注释
COMMENT ON TABLE user_robots IS '用户绑定的机器人';
COMMENT ON COLUMN user_robots.user_id IS '用户ID';
COMMENT ON COLUMN user_robots.robot_id IS '机器人ID';
COMMENT ON COLUMN user_robots.nickname IS '用户自定义昵称';
