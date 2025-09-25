import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, Mail, Phone, Building, Calendar, Camera, 
  Save, X, MapPin, Globe, Briefcase, Clock
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

interface UserProfile {
  name: string;
  email: string;
  phone: string;
  company: string;
  position: string;
  location: string;
  timezone: string;
  bio: string;
  avatar?: string;
  joinDate: string;
}

const Profile = () => {
  const { user } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  
  const [profile, setProfile] = useState<UserProfile>({
    name: user?.name || '',
    email: user?.email || '',
    phone: '',
    company: 'אברהם תקשורת',
    position: 'מנהל מכירות',
    location: 'תל אביב, ישראל',
    timezone: 'Asia/Jerusalem',
    bio: '',
    joinDate: new Date().toISOString(),
  });

  useEffect(() => {
    // טעינת התמונה מהלוקל סטורג' בטעינת הדף (user-specific)
    if (user?.id) {
      const savedAvatar = localStorage.getItem(`userAvatar_${user.id}`);
      if (savedAvatar) {
        setAvatarPreview(savedAvatar);
      }
    }
  }, [user?.id]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('גודל התמונה חייב להיות קטן מ-5MB');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Image = reader.result as string;
        setAvatarPreview(base64Image);
        // שמירת התמונה בלוקל סטורג' (user-specific)
        if (user?.id) {
          localStorage.setItem(`userAvatar_${user.id}`, base64Image);
        }
        // עדכון האייקון בהדר
        const headerAvatar = document.querySelector('.header-avatar') as HTMLImageElement;
        if (headerAvatar) {
          headerAvatar.src = base64Image;
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    // שמירת הפרופיל
    toast.success('הפרופיל עודכן בהצלחה');
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setAvatarPreview(null);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
        {/* Cover Image */}
        <div className="h-32 bg-gradient-to-r from-blue-500 to-blue-600" />

        {/* Profile Header */}
        <div className="relative px-6 pb-6">
          <div className="flex flex-col md:flex-row items-center gap-4 -mt-16">
            <div className="relative">
              <div className="w-32 h-32 rounded-full border-4 border-white dark:border-gray-800 overflow-hidden bg-gray-100 dark:bg-gray-700">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="תמונת פרופיל"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User className="w-16 h-16 text-gray-400" />
                  </div>
                )}
              </div>
              {isEditing && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
                >
                  <Camera className="w-5 h-5" />
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            <div className="flex-1 text-center md:text-right">
              <div className="flex flex-col md:flex-row items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {isEditing ? (
                      <input
                        type="text"
                        value={profile.name}
                        onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                        className="bg-transparent border-b border-gray-300 dark:border-gray-600 focus:border-blue-500 px-1"
                      />
                    ) : (
                      profile.name
                    )}
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400">{profile.position}</p>
                </div>
                <div className="mt-4 md:mt-0">
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleCancel}
                        className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                      >
                        <X className="w-5 h-5" />
                      </button>
                      <button
                        onClick={handleSave}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                      >
                        <Save className="w-5 h-5" />
                        שמור שינויים
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      ערוך פרופיל
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Content */}
        <div className="border-t border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">פרטים אישיים</h2>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Mail className="w-5 h-5 text-gray-400" />
                  {isEditing ? (
                    <input
                      type="email"
                      value={profile.email}
                      onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                      className="bg-transparent border-b border-gray-300 dark:border-gray-600 focus:border-blue-500 px-1"
                    />
                  ) : (
                    <span className="text-gray-600 dark:text-gray-400">{profile.email}</span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Phone className="w-5 h-5 text-gray-400" />
                  {isEditing ? (
                    <input
                      type="tel"
                      value={profile.phone}
                      onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                      className="bg-transparent border-b border-gray-300 dark:border-gray-600 focus:border-blue-500 px-1"
                      dir="ltr"
                    />
                  ) : (
                    <span className="text-gray-600 dark:text-gray-400" dir="ltr">{profile.phone || 'לא הוגדר'}</span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-gray-400" />
                  {isEditing ? (
                    <input
                      type="text"
                      value={profile.location}
                      onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                      className="bg-transparent border-b border-gray-300 dark:border-gray-600 focus:border-blue-500 px-1"
                    />
                  ) : (
                    <span className="text-gray-600 dark:text-gray-400">{profile.location}</span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-gray-400" />
                  {isEditing ? (
                    <select
                      value={profile.timezone}
                      onChange={(e) => setProfile({ ...profile, timezone: e.target.value })}
                      className="bg-transparent border-b border-gray-300 dark:border-gray-600 focus:border-blue-500 px-1"
                    >
                      <option value="Asia/Jerusalem">ישראל (UTC+2/3)</option>
                      <option value="Europe/London">London (UTC+0/1)</option>
                      <option value="America/New_York">New York (UTC-5/4)</option>
                    </select>
                  ) : (
                    <span className="text-gray-600 dark:text-gray-400">
                      {profile.timezone === 'Asia/Jerusalem' ? 'ישראל (UTC+2/3)' : profile.timezone}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">מידע מקצועי</h2>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Building className="w-5 h-5 text-gray-400" />
                  {isEditing ? (
                    <input
                      type="text"
                      value={profile.company}
                      onChange={(e) => setProfile({ ...profile, company: e.target.value })}
                      className="bg-transparent border-b border-gray-300 dark:border-gray-600 focus:border-blue-500 px-1"
                    />
                  ) : (
                    <span className="text-gray-600 dark:text-gray-400">{profile.company}</span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-gray-400" />
                  {isEditing ? (
                    <input
                      type="text"
                      value={profile.position}
                      onChange={(e) => setProfile({ ...profile, position: e.target.value })}
                      className="bg-transparent border-b border-gray-300 dark:border-gray-600 focus:border-blue-500 px-1"
                    />
                  ) : (
                    <span className="text-gray-600 dark:text-gray-400">{profile.position}</span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-600 dark:text-gray-400">
                    הצטרף ב-{new Date(profile.joinDate).toLocaleDateString('he-IL')}
                  </span>
                </div>
              </div>

              {isEditing && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    אודות
                  </label>
                  <textarea
                    value={profile.bio}
                    onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                    rows={4}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent px-3 py-2"
                    placeholder="ספר קצת על עצמך..."
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;