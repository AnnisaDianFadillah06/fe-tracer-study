import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Mail, User, Users, Clock, Calendar, KeyRound, Settings, Shield } from "lucide-react";
import { motion } from "framer-motion";

const ProfilePage = () => {
  // Mock user data
  const userData = {
    email: "d4komputer@polban.ac.id",
    username: "d4komputer",
    group: "Kaprodi",
    lastLogin: "January 4, 2026",
    registeredAt: "August 24, 2017",
    name: "D4 Teknik Informatika",
    updatedOn: "January 1, 1970",
    avatar: null,
  };

  const profileFields = [
    { label: "E-mail", value: userData.email, icon: Mail },
    { label: "Username", value: userData.username, icon: User },
    { label: "Grup", value: userData.group, icon: Shield, isBadge: true },
    { label: "Terakhir masuk", value: userData.lastLogin, icon: Clock },
    { label: "Registrasi pada", value: userData.registeredAt, icon: Calendar },
    { label: "Updated On", value: userData.updatedOn, icon: Calendar },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="glass-card overflow-hidden">
            {/* Gradient Banner */}
            <div className="h-32 bg-gradient-to-r from-primary via-orange-light to-cyan relative">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMtOS45NDEgMC0xOCA4LjA1OS0xOCAxOHM4LjA1OSAxOCAxOCAxOCAxOC04LjA1OSAxOC0xOC04LjA1OS0xOC0xOC0xOHoiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjEpIiBzdHJva2Utd2lkdGg9IjIiLz48L2c+PC9zdmc+')] opacity-30" />
              <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background to-transparent" />
            </div>

            {/* Profile Content */}
            <div className="px-6 pb-6 -mt-16 relative">
              <div className="flex flex-col md:flex-row items-center md:items-end gap-4">
                {/* Avatar */}
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.4 }}
                >
                  <Avatar className="w-28 h-28 border-4 border-background shadow-xl ring-4 ring-primary/20">
                    <AvatarImage src={userData.avatar || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-orange-light text-primary-foreground text-3xl font-bold">
                      {userData.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </motion.div>

                {/* Name and Badge */}
                <div className="flex-1 text-center md:text-left mb-2">
                  <h1 className="text-2xl font-heading font-bold text-foreground">{userData.name}</h1>
                  <div className="flex items-center justify-center md:justify-start gap-2 mt-2">
                    <Badge className="bg-primary/20 text-primary border-primary/30 hover:bg-primary/30">
                      <Shield className="w-3 h-3 mr-1" />
                      {userData.group}
                    </Badge>
                    <Badge variant="outline" className="border-cyan/30 text-cyan">
                      <Users className="w-3 h-3 mr-1" />
                      Admin
                    </Badge>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button asChild size="sm" className="shadow-lg">
                    <Link to="/dashboard/change-password">
                      <KeyRound className="w-4 h-4 mr-2" />
                      Ganti Password
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm">
                    <Settings className="w-4 h-4 mr-2" />
                    Edit Profil
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Info Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {profileFields.map((field, index) => (
            <motion.div
              key={field.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * (index + 1), duration: 0.4 }}
            >
              <Card className="glass-card hover:border-primary/30 transition-all duration-300 group">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-orange-light/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <field.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-muted-foreground">{field.label}</p>
                      {field.isBadge ? (
                        <Badge variant="secondary" className="mt-1">{field.value}</Badge>
                      ) : (
                        <p className="text-sm font-medium text-foreground truncate">{field.value}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Activity Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.4 }}
        >
          <Card className="glass-card">
            <CardContent className="p-6">
              <h3 className="text-lg font-heading font-semibold mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Aktivitas Akun
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5">
                  <p className="text-2xl font-bold text-primary">8+</p>
                  <p className="text-xs text-muted-foreground mt-1">Tahun Aktif</p>
                </div>
                <div className="text-center p-4 rounded-xl bg-gradient-to-br from-cyan/10 to-cyan/5">
                  <p className="text-2xl font-bold text-cyan">150+</p>
                  <p className="text-xs text-muted-foreground mt-1">Total Login</p>
                </div>
                <div className="text-center p-4 rounded-xl bg-gradient-to-br from-success/10 to-success/5">
                  <p className="text-2xl font-bold text-success">24</p>
                  <p className="text-xs text-muted-foreground mt-1">Laporan Dibuat</p>
                </div>
                <div className="text-center p-4 rounded-xl bg-gradient-to-br from-orange-light/10 to-orange-light/5">
                  <p className="text-2xl font-bold text-orange-light">5</p>
                  <p className="text-xs text-muted-foreground mt-1">Tim Dikelola</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default ProfilePage;
