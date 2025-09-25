import React, { useState, useRef, useEffect } from 'react';
import { 
  User, Mail, Phone, Building, Camera, 
  Save, X, Globe, Briefcase, Clock
} from 'lucide-react';
import useAuthStore from '../store/authStore';
import toast from 'react-hot-toast';
import { API_BASE_URL } from '../config/api';

interface UserProfile {
  name: string;
  email: string;
  phone: string;
  company: string;
  position: string;
  timezone: string;
  bio: string;
  avatar?: string;
  joinDate: string;
  department?: string;
  role?: string;
}

const Profile = () => {
  const { user, updateUser } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [profile, setProfile] = useState<UserProfile>({
    name: '',
    email: '',
    phone: '',
    company: '',
    position: '',
    timezone: 'Asia/Jerusalem',
    bio: '',
    joinDate: new Date().toISOString(),
    department: '',
    role: '',
  });

  // Load user profile data from API
  useEffect(() => {
    const loadUserProfile = async () => {
      if (!user?.id) return;
      
      try {
        setLoading(true);
        const sessionToken = localStorage.getItem('session_token');
        const accessToken = localStorage.getItem('access_token');
        
        // Get user profile data
        const response = await fetch(`${API_BASE_URL}/users/profile/${user.id}`, {
          headers: {
            'X-Session-Token': sessionToken || '',
            'Authorization': `Bearer ${accessToken || ''}`
          }
        });

        if (response.ok) {
          const profileData = await response.json();
          setProfile({
            name: profileData.user ? `${profileData.user.first_name || ''} ${profileData.user.last_name || ''}`.trim() : user.name || '',
            email: profileData.user?.email || user.email || '',
            phone: profileData.user?.phone_number || profileData.profile?.phone || '',
            company: profileData.profile?.company || 'אברהם תקשורת',
            position: profileData.profile?.position || getRoleDisplayName(profileData.user?.role || user.role),
            timezone: profileData.profile?.timezone || 'Asia/Jerusalem',
            bio: profileData.profile?.bio || '',
            joinDate: profileData.user?.created_at || new Date().toISOString(),
            department: profileData.user?.department || '',
            role: profileData.user?.role || user.role || '',
          });

          // Load avatar if exists
          console.log('Profile data loaded:', profileData);
          if (profileData.profile?.avatar_url) {
            console.log('Loading avatar from database');
            setAvatarPreview(profileData.profile.avatar_url);
            // Also save to localStorage for offline access
            localStorage.setItem(`userAvatar_${user.id}`, profileData.profile.avatar_url);
          } else {
            // Load saved avatar from localStorage as fallback (user-specific)
            console.log('No avatar in database, checking localStorage');
            const savedAvatar = localStorage.getItem(`userAvatar_${user.id}`);
            if (savedAvatar) {
              console.log('Loading avatar from localStorage');
              setAvatarPreview(savedAvatar);
            }
          }
        } else {
        // Fallback to basic user data
        setProfile({
          name: user.name || '',
          email: user.email || '',
          phone: '',
          company: 'אברהם תקשורת',
          position: getRoleDisplayName(user.role),
          timezone: 'Asia/Jerusalem',
          bio: '',
          joinDate: new Date().toISOString(),
          department: '',
          role: user.role || '',
        });
        }
      } catch (error) {
        console.error('Error loading user profile:', error);
        toast.error('שגיאה בטעינת נתוני הפרופיל');
        
        // Fallback to basic user data
        setProfile({
          name: user.name || '',
          email: user.email || '',
          phone: '',
          company: 'אברהם תקשורת',
          position: getRoleDisplayName(user.role),
          timezone: 'Asia/Jerusalem',
          bio: '',
          joinDate: new Date().toISOString(),
          department: '',
          role: user.role || '',
        });
      } finally {
        setLoading(false);
      }
    };

    loadUserProfile();
  }, [user]);

  // Helper function to get role display name
  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'admin':
        return 'מנהל מערכת';
      case 'manager':
        return 'מנהל מכירות';
      case 'agent':
        return 'נציג מכירות';
      default:
        return 'משתמש';
    }
  };

  const compressImage = (file: File, maxWidth: number = 300, quality: number = 0.8): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img;
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      };

      img.src = URL.createObjectURL(file);
    });
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('גודל התמונה חייב להיות קטן מ-5MB');
        return;
      }

      try {
        // Compress the image
        const compressedImage = await compressImage(file, 300, 0.8);
        setAvatarPreview(compressedImage);
        
        // Save to localStorage with user-specific key
        if (user?.id) {
          localStorage.setItem(`userAvatar_${user.id}`, compressedImage);
        }

        // Trigger storage event manually for other components
        window.dispatchEvent(new StorageEvent('storage', {
          key: `userAvatar_${user?.id}`,
          newValue: compressedImage
        }));

        console.log('Original file size:', file.size, 'bytes');
        console.log('Compressed image size:', compressedImage.length, 'characters');
      } catch (error) {
        console.error('Error compressing image:', error);
        toast.error('שגיאה בעיבוד התמונה');
      }
    }
  };

  const handleSave = async () => {
    if (!user?.id) return;
    
    try {
      setSaving(true);
      const sessionToken = localStorage.getItem('session_token');
      const accessToken = localStorage.getItem('access_token');
      
      // Prepare user data updates
      const nameParts = profile.name.split(' ');
      const userUpdates = {
        first_name: nameParts[0] || '',
        last_name: nameParts.slice(1).join(' ') || '',
        email: profile.email,
        phone_number: profile.phone,
        department: profile.department
      };

      // Prepare profile data updates
      const profileUpdates = {
        bio: profile.bio,
        avatar_url: avatarPreview
      };

      console.log('Profile updates:', {
        ...profileUpdates,
        avatar_url: avatarPreview ? `base64 string (length: ${avatarPreview.length})` : null
      });

      // Update user data
      const userResponse = await fetch(`${API_BASE_URL}/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Token': sessionToken || '',
          'Authorization': `Bearer ${accessToken || ''}`
        },
        body: JSON.stringify(userUpdates)
      });

      if (!userResponse.ok) {
        throw new Error('שגיאה בעדכון נתוני המשתמש');
      }

      // Update profile data
      const profileResponse = await fetch(`${API_BASE_URL}/users/profile/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Token': sessionToken || '',
          'Authorization': `Bearer ${accessToken || ''}`
        },
        body: JSON.stringify(profileUpdates)
      });

      if (!profileResponse.ok) {
        const errorData = await profileResponse.text();
        console.error('Profile update failed:', {
          status: profileResponse.status,
          statusText: profileResponse.statusText,
          error: errorData
        });
        throw new Error('שגיאה בעדכון נתוני הפרופיל');
      }

      const profileResult = await profileResponse.json();
      console.log('Profile update success:', profileResult);

      // Update the preview with the saved avatar
      if (profileResult.profile?.avatar_url) {
        setAvatarPreview(profileResult.profile.avatar_url);
      }

      // Update auth store with new user data
      if (user) {
        updateUser({
          ...user,
          name: profile.name,
          email: profile.email
        });
      }

      // Save avatar to localStorage as backup (user-specific)
      if (avatarPreview && user?.id) {
        localStorage.setItem(`userAvatar_${user.id}`, avatarPreview);
        
        // Trigger storage event manually for other components
        window.dispatchEvent(new StorageEvent('storage', {
          key: `userAvatar_${user.id}`,
          newValue: avatarPreview
        }));
      }

      toast.success('הפרופיל עודכן בהצלחה');
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving profile:', error);
      
      // Log more details about the error
      if (error instanceof Error) {
        console.log('Error message:', error.message);
      }
      
      toast.error('שגיאה בשמירת הפרופיל');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    // Reload profile data from API
    if (user?.id) {
      const sessionToken = localStorage.getItem('session_token');
      const accessToken = localStorage.getItem('access_token');
      
      fetch(`${API_BASE_URL}/users/profile/${user.id}`, {
        headers: {
          'X-Session-Token': sessionToken || '',
          'Authorization': `Bearer ${accessToken || ''}`
        }
      })
      .then(response => response.json())
      .then(profileData => {
        setProfile({
          name: profileData.user ? `${profileData.user.first_name || ''} ${profileData.user.last_name || ''}`.trim() : user.name || '',
          email: profileData.user?.email || user.email || '',
          phone: profileData.user?.phone_number || profileData.profile?.phone || '',
          company: profileData.profile?.company || 'אברהם תקשורת',
          position: profileData.profile?.position || getRoleDisplayName(profileData.user?.role || user.role),
          timezone: profileData.profile?.timezone || 'Asia/Jerusalem',
          bio: profileData.profile?.bio || '',
          joinDate: profileData.user?.created_at || new Date().toISOString(),
          department: profileData.user?.department || '',
          role: profileData.user?.role || user.role || '',
        });

        if (profileData.profile?.avatar_url) {
          setAvatarPreview(profileData.profile.avatar_url);
        } else {
          const savedAvatar = localStorage.getItem(`userAvatar_${user.id}`);
          if (savedAvatar) {
            setAvatarPreview(savedAvatar);
          }
        }
      })
      .catch(error => {
        console.error('Error reloading profile:', error);
      });
    }

    setIsEditing(false);
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-4 md:space-y-6 p-4 md:p-0">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
          <div className="h-24 md:h-32 bg-gradient-to-r from-blue-500 to-blue-600" />
          <div className="relative px-4 md:px-6 pb-4 md:pb-6">
            <div className="flex flex-col items-center gap-4 -mt-12 md:-mt-16">
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-white dark:border-gray-800 overflow-hidden bg-gray-100 dark:bg-gray-700 animate-pulse" />
              <div className="flex-1 text-center w-full">
                <div className="h-6 md:h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-32 mx-auto" />
              </div>
            </div>
          </div>
          <div className="border-t border-gray-200 dark:border-gray-700 p-4 md:p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-24" />
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                </div>
              </div>
              <div className="space-y-4">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-24" />
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4 md:space-y-6 p-4 md:p-0">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
        {/* Cover Image */}
        <div className="h-24 md:h-32 bg-gradient-to-r from-blue-500 to-blue-600" />

        {/* Profile Header */}
        <div className="relative px-4 md:px-6 pb-4 md:pb-6">
          <div className="flex flex-col items-center gap-4 -mt-12 md:-mt-16">
            <div className="relative">
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-white dark:border-gray-800 overflow-hidden bg-gray-100 dark:bg-gray-700">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="תמונת פרופיל"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User className="w-12 h-12 md:w-16 md:h-16 text-gray-400" />
                  </div>
                )}
              </div>
              {isEditing && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors min-w-[40px] min-h-[40px]"
                >
                  <Camera className="w-4 h-4 md:w-5 md:h-5" />
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

            <div className="flex-1 text-center w-full">
              <div className="flex flex-col items-center gap-4">
                <div className="w-full">
                  <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
                    {isEditing ? (
                      <input
                        type="text"
                        value={profile.name}
                        onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                        className="bg-transparent border-b border-gray-300 dark:border-gray-600 focus:border-blue-500 px-2 py-1 text-center w-full text-base md:text-xl lg:text-2xl"
                        placeholder="שם מלא"
                      />
                    ) : (
                      profile.name || 'שם לא הוגדר'
                    )}
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400 text-sm md:text-base mt-1">
                    {profile.position || 'תפקיד לא הוגדר'}
                  </p>
                </div>
                <div className="w-full">
                  {isEditing ? (
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
                      <button
                        onClick={handleCancel}
                        disabled={saving}
                        className="px-4 py-3 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white disabled:opacity-50 min-h-[44px] text-base"
                      >
                        <X className="w-5 h-5" />
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 disabled:opacity-50 min-h-[44px] text-base w-full sm:w-auto"
                      >
                        {saving ? (
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Save className="w-5 h-5" />
                        )}
                        {saving ? 'שומר...' : 'שמור שינויים'}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 min-h-[44px] text-base w-full sm:w-auto"
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-4 md:p-6">
            <div className="space-y-4">
              <h2 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white mb-4">פרטים אישיים</h2>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  {isEditing ? (
                    <input
                      type="email"
                      value={profile.email}
                      onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                      className="bg-transparent border-b border-gray-300 dark:border-gray-600 focus:border-blue-500 px-2 py-1 text-base w-full"
                      placeholder="דואר אלקטרוני"
                    />
                  ) : (
                    <span className="text-gray-600 dark:text-gray-400 text-sm md:text-base break-all">{profile.email}</span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  {isEditing ? (
                    <input
                      type="tel"
                      value={profile.phone}
                      onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                      className="bg-transparent border-b border-gray-300 dark:border-gray-600 focus:border-blue-500 px-2 py-1 text-base w-full"
                      dir="ltr"
                      placeholder="מספר טלפון"
                    />
                  ) : (
                    <span className="text-gray-600 dark:text-gray-400 text-sm md:text-base" dir="ltr">{profile.phone || 'לא הוגדר'}</span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <Globe className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  <span className="text-gray-600 dark:text-gray-400 text-sm md:text-base">
                    {profile.timezone === 'Asia/Jerusalem' ? 'ישראל (UTC+2/3)' : profile.timezone}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white mb-4">מידע מקצועי</h2>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Building className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  <span className="text-gray-600 dark:text-gray-400 text-sm md:text-base">{profile.company}</span>
                </div>

                <div className="flex items-center gap-3">
                  <Briefcase className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  <span className="text-gray-600 dark:text-gray-400 text-sm md:text-base">{profile.position}</span>
                </div>

                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  <span className="text-gray-600 dark:text-gray-400 text-sm md:text-base">
                    הצטרף ב-{new Date(profile.joinDate).toLocaleDateString('he-IL')}
                  </span>
                </div>

                {profile.department && (
                  <div className="flex items-center gap-3">
                    <Building className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    {isEditing ? (
                      <input
                        type="text"
                        value={profile.department}
                        onChange={(e) => setProfile({ ...profile, department: e.target.value })}
                        className="bg-transparent border-b border-gray-300 dark:border-gray-600 focus:border-blue-500 px-2 py-1 text-base w-full"
                        placeholder="מחלקה"
                      />
                    ) : (
                      <span className="text-gray-600 dark:text-gray-400 text-sm md:text-base">{profile.department}</span>
                    )}
                  </div>
                )}
              </div>

              {(isEditing || profile.bio) && (
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    אודות
                  </label>
                  {isEditing ? (
                    <textarea
                      value={profile.bio}
                      onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                      rows={4}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent px-3 py-3 text-base resize-none"
                      placeholder="ספר קצת על עצמך..."
                    />
                  ) : (
                    <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap text-sm md:text-base">
                      {profile.bio || 'לא נוסף תיאור'}
                    </p>
                  )}
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