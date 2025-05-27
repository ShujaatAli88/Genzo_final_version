import React from 'react';
import ReactDOM from 'react-dom';
import LoginForm from './components/loginForm';
import RegisterForm from './components/registerForm';

function App() {
    return (
        <div>
            <LoginForm />
            <RegisterForm />
        </div>
    );
}

ReactDOM.render(<App />, document.getElementById('root'));
