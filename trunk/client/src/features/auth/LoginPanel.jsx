import React, { useState } from 'react';
import { User, Lock, ArrowRight } from 'lucide-react';

// 只负责业务逻辑，不关心样式
const LoginPanel = ({ theme, onLogin }) => {
  const { Button, Input, Card, titleColor } = theme;
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Login attempt:', username, password);
    if (username && password) {
      onLogin(username);
    } else {
      console.log('Username or password is empty');
    }
  };

  return (
    <Card>
      <div className="text-center mb-8">
        <h2 className={`text-3xl font-bold mb-2 ${titleColor} uppercase`}>
          System Access
        </h2>
        <p className="text-gray-500 text-sm">Enter your credentials</p>
      </div>
      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="space-y-4">
          <Input 
            type="text" 
            placeholder="Username" 
            icon={User}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <Input 
            type="password" 
            placeholder="Password" 
            icon={Lock}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div className="space-y-3 pt-2">
          <Button variant="primary" type="submit" className="w-full">
            Login Now <ArrowRight size={16} />
          </Button>
          <Button variant="secondary" type="button" className="w-full">
            Forgot Password?
          </Button>
        </div>
      </form>
    </Card>
  );
};

export default LoginPanel;
