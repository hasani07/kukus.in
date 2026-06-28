import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (login(username, password)) {
      navigate("/", { replace: true });
    } else {
      setError("Username atau password salah");
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="font-extrabold text-4xl text-[#2D3A30] tracking-tight">
            Kukus<span className="text-[#D17B60]">.in</span>
          </h1>
          <p className="text-sm text-[#6B756D] mt-1 tracking-wider uppercase">Finance Suite</p>
        </div>

        <Card className="border-[#E5E2DC]">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="username" className="text-[#2D3A30]">Username</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => { setUsername(e.target.value); setError(""); }}
                  placeholder="Username"
                  className="mt-1"
                  autoComplete="username"
                />
              </div>
              <div>
                <Label htmlFor="password" className="text-[#2D3A30]">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  placeholder="Password"
                  className="mt-1"
                  autoComplete="current-password"
                />
              </div>
              {error && <p className="text-xs text-[#D17B60] font-medium">{error}</p>}
              <Button type="submit" className="w-full bg-[#4A6750] hover:bg-[#3B5340] text-white">
                Masuk
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
