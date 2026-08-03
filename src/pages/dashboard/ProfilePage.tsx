import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Mail, User, Shield, GraduationCap, KeyRound, Settings, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useProfile } from "@/hooks/useProfile";

const ProfilePage = () => {
  const { profile, isLoading } = useProfile();

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64 gap-3 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Memuat profil…</span>
        </div>
      </DashboardLayout>
    );
  }

  if (!profile) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          Data profil tidak tersedia.
        </div>
      </DashboardLayout>
    );
  }

  const profileFields = [
    { label: "E-mail", value: profile.email, icon: Mail },
    { label: "Nama", value: profile.name, icon: User },
    { label: "Role", value: profile.roleLabel, description: profile.roleDescription, icon: Shield, isBadge: true },
    ...(profile.programName
      ? [{ label: "Program Studi", value: `${profile.programDegree ?? ""} ${profile.programName}`.trim(), icon: GraduationCap }]
      : []),
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
            <div className="h-32 bg-gradient-to-r from-primary via-orange-light to-cyan relative">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMtOS45NDEgMC0xOCA4LjA1OS0xOCAxOHM4LjA1OSAxOCAxOCAxOCAxOC04LjA1OSAxOC0xOC04LjA1OS0xOC0xOC0xOHoiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjEpIiBzdHJva2Utd2lkdGg9IjIiLz48L2c+PC9zdmc+')] opacity-30" />
              <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background to-transparent" />
            </div>

            <div className="px-6 pb-6 -mt-16 relative">
              <div className="flex flex-col md:flex-row items-center md:items-end gap-4">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.4 }}
                >
                  <Avatar className="w-28 h-28 border-4 border-background shadow-xl ring-4 ring-primary/20">
                    <AvatarFallback className="bg-gradient-to-br from-primary to-orange-light text-primary-foreground text-3xl font-bold">
                      {profile.initials}
                    </AvatarFallback>
                  </Avatar>
                </motion.div>

                <div className="flex-1 text-center md:text-left mb-2">
                  <h1 className="text-2xl font-heading font-bold text-foreground">{profile.name}</h1>
                  <div className="flex items-center justify-center md:justify-start gap-2 mt-2">
                    <Badge className="bg-primary/20 text-primary border-primary/30 hover:bg-primary/30">
                      <Shield className="w-3 h-3 mr-1" />
                      {profile.roleLabel}
                    </Badge>
                    {profile.programName && (
                      <Badge variant="outline" className="border-cyan/30 text-cyan">
                        <GraduationCap className="w-3 h-3 mr-1" />
                        {profile.programDegree} {profile.programName}
                      </Badge>
                    )}
                  </div>
                </div>

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
                      {"isBadge" in field && field.isBadge ? (
                        <div className="flex flex-col gap-1 mt-1">
                          <Badge variant="secondary">{field.value}</Badge>
                          {"description" in field && field.description && (
                            <p className="text-xs text-muted-foreground">{field.description}</p>
                          )}
                        </div>
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
      </div>
    </DashboardLayout>
  );
};

export default ProfilePage;
