'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, Shield, Image as ImageIcon } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import apiClient from '@/lib/api.client';
import styles from './profile.module.css';
import { CURRENCIES } from '@/lib/currency';

export default function ProfilePage() {
  const router = useRouter();
  // Correction de la coquille: setProfiale -> setProfile
  const [profile, setProfile] = useState<any>(null);

  // Forms state
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [preferredCurrency, setPreferredCurrency] = useState('USD');

  // Avatar state pour l'upload de fichier
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState('');

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Status state
  const [infoStatus, setInfoStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [avatarStatus, setAvatarStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [pwdStatus, setPwdStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [sessionStatus, setSessionStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [isOldPasswordCorrect, setIsOldPasswordCorrect] = useState<boolean | null>(null);
  const [isCheckingPassword, setIsCheckingPassword] = useState(false);

  const doPasswordsMatch = newPassword && confirmPassword ? newPassword === confirmPassword : null;

  useEffect(() => {
    if (!oldPassword) {
      setIsOldPasswordCorrect(null);
      setIsCheckingPassword(false);
      return;
    }

    setIsCheckingPassword(true);
    const delayDebounceFn = setTimeout(async () => {
      try {
        const response = await apiClient.post('/user/verify-password', { password: oldPassword });
        setIsOldPasswordCorrect(response.data.valid);
      } catch (error) {
        console.error('Error verifying password', error);
        setIsOldPasswordCorrect(false);
      } finally {
        setIsCheckingPassword(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [oldPassword]);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await apiClient.get('/user/profile');
        const data = response.data;
        setProfile(data);
        setUsername(data.username || '');
        setEmail(data.email || '');
        setPreferredCurrency(data.preferredCurrency || 'USD');
        setAvatarPreview(data.avatarUrl || ''); // On initialise la prévisualisation avec l'avatar actuel
      } catch (error) {
        console.error('Failed to fetch profile', error);
      }
    };
    fetchProfile();
  }, []);

  // -- MISE À JOUR DES INFOS (SURNOM, MAIL, DEVISE) --
  const handleUpdateInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setInfoStatus(null);
    try {
      await apiClient.put('/user/profile', { username, email, preferredCurrency });
      setInfoStatus({ type: 'success', message: 'Informations mises à jour avec succès.' });
      setTimeout(() => window.location.reload(), 1000);
    } catch (error: any) {
      setInfoStatus({ type: 'error', message: error.response?.data?.error || 'Échec de la mise à jour.' });
    } finally {
      setIsLoading(false);
    }
  };

  // -- GESTION DE LA SÉLECTION DU FICHIER --
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      // Créer une URL locale pour prévisualiser l'image directement
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  // -- UPLOAD DE L'AVATAR (FICHIER PC) --
  const handleUpdateAvatar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!avatarFile) {
      setAvatarStatus({ type: 'error', message: 'Veuillez sélectionner une image.' });
      return;
    }

    setIsLoading(true);
    setAvatarStatus(null);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        try {
          await apiClient.put('/user/avatar', { avatarData: base64String });
          setAvatarStatus({ type: 'success', message: 'Avatar mis à jour avec succès.' });
          setTimeout(() => window.location.reload(), 1000);
        } catch (error: any) {
          setAvatarStatus({ type: 'error', message: error.response?.data?.error || 'Échec de l\'upload.' });
        } finally {
          setIsLoading(false);
        }
      };
      reader.readAsDataURL(avatarFile);
    } catch {
      setAvatarStatus({ type: 'error', message: 'Erreur lors de la lecture du fichier.' });
      setIsLoading(false);
    }
  };

  // -- CHANGEMENT DE MOT DE PASSE --
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdStatus(null);

    if (newPassword !== confirmPassword) {
      setPwdStatus({ type: 'error', message: 'Les nouveaux mots de passe ne correspondent pas.' });
      return;
    }

    setIsLoading(true);
    try {
      await apiClient.put('/user/change-password', { oldPassword, newPassword });
      setPwdStatus({ type: 'success', message: 'Mot de passe modifié avec succès.' });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      setPwdStatus({ type: 'error', message: error.response?.data?.error || 'Échec de la modification.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogoutAll = async () => {
    setIsLoading(true);
    setSessionStatus(null);

    try {
      await apiClient.post('/auth/logout-all');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('refreshTokenExpiresAt');
      setSessionStatus({ type: 'success', message: 'Toutes les sessions ont ete fermees.' });
      router.push('/auth/login');
    } catch (error: any) {
      setSessionStatus({
        type: 'error',
        message: error.response?.data?.error || 'Impossible de fermer toutes les sessions.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!profile) return <div className={styles.container}>Loading profile...</div>;

  return (
    <div className={styles.container}>
      <div>
        <h1 className={styles.title}>Profile Settings</h1>
        <p className={styles.subtitle}>Manage your account details and security preferences.</p>
      </div>

      {/* Personal Info Section */}
      <Card glass>
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <User size={20} /> Personal Information
          </h2>
          {infoStatus && (
            <div className={infoStatus.type === 'success' ? styles.successMessage : styles.errorMessage}>
              {infoStatus.message}
            </div>
          )}
          <form onSubmit={handleUpdateInfo} className={styles.section}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Surnom (Username)</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={styles.input}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Adresse Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={styles.input}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Preferred Currency</label>
              <select
                value={preferredCurrency}
                onChange={(e) => setPreferredCurrency(e.target.value)}
                className={styles.input}
              >
                {Object.values(CURRENCIES).map((curr) => (
                  <option key={curr.code} value={curr.code}>
                    {curr.name}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className={styles.button} disabled={isLoading}>
              {isLoading ? 'Sauvegarde...' : 'Sauvegarder les infos'}
            </button>
          </form>
        </div>
      </Card>

      {/* Avatar Management Section */}
      <Card glass>
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <ImageIcon size={20} /> Avatar
          </h2>
          {avatarStatus && (
            <div className={avatarStatus.type === 'success' ? styles.successMessage : styles.errorMessage}>
              {avatarStatus.message}
            </div>
          )}
          <form onSubmit={handleUpdateAvatar} className={styles.section}>
            <div className={styles.avatarContainer}>
              {avatarPreview ? (
                <img src={avatarPreview} alt="Preview" className={styles.avatarPreview} onError={(e) => (e.currentTarget.src = '')} />
              ) : (
                <div className={styles.avatarFallback}>{username ? username[0].toUpperCase() : 'U'}</div>
              )}
              <div className={styles.formGroup} style={{ flex: 1 }}>
                <label className={styles.label}>Upload depuis le PC</label>
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  onChange={handleFileChange}
                  className={styles.input}
                />
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Formats supportés: JPEG, PNG, WEBP.</p>
              </div>
            </div>
            <button type="submit" className={styles.button} disabled={isLoading || !avatarFile}>
              {isLoading ? 'Upload en cours...' : 'Mettre à jour l\'avatar'}
            </button>
          </form>
        </div>
      </Card>

      {/* Security Section (Inchangée) */}
      <Card glass>
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <Shield size={20} /> Security
          </h2>
          {pwdStatus && (
            <div className={pwdStatus.type === 'success' ? styles.successMessage : styles.errorMessage}>
              {pwdStatus.message}
            </div>
          )}
          <form onSubmit={handleChangePassword} className={styles.section}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Current Password</label>
              <input
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className={`${styles.input} ${
                  isOldPasswordCorrect === false ? styles.inputError : 
                  isOldPasswordCorrect === true ? styles.inputSuccess : ''
                }`}
                required
              />
              {isCheckingPassword && (
                <p className={styles.inputFeedbackChecking}>Vérification du mot de passe...</p>
              )}
              {isOldPasswordCorrect === false && !isCheckingPassword && (
                <p className={styles.inputFeedbackError}>Mot de passe actuel incorrect.</p>
              )}
              {isOldPasswordCorrect === true && !isCheckingPassword && (
                <p className={styles.inputFeedbackSuccess}>Mot de passe correct.</p>
              )}
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={styles.input}
                required
                minLength={6}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`${styles.input} ${
                  doPasswordsMatch === false ? styles.inputError :
                  doPasswordsMatch === true ? styles.inputSuccess : ''
                }`}
                required
                minLength={6}
              />
              {doPasswordsMatch === false && (
                <p className={styles.inputFeedbackError}>Les mots de passe ne correspondent pas.</p>
              )}
              {doPasswordsMatch === true && (
                <p className={styles.inputFeedbackSuccess}>Les mots de passe correspondent.</p>
              )}
            </div>
            <button type="submit" className={styles.button} disabled={isLoading || isCheckingPassword || isOldPasswordCorrect !== true}>
              {isLoading ? 'Modification...' : 'Changer le mot de passe'}
            </button>
          </form>

          {sessionStatus && (
            <div className={sessionStatus.type === 'success' ? styles.successMessage : styles.errorMessage}>
              {sessionStatus.message}
            </div>
          )}
          <button type="button" className={styles.button} onClick={handleLogoutAll} disabled={isLoading}>
            Fermer toutes les sessions
          </button>
        </div>
      </Card>
    </div>
  );
}
