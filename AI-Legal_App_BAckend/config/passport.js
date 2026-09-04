import passport from 'passport';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import { Strategy as DiscordStrategy } from 'passport-discord';
import { OAuth2Strategy as MicrosoftStrategy } from 'passport-microsoft';
import { OAuth2Strategy as LinkedInStrategy } from 'passport-linkedin-oauth2';
import UserModel from './models/User.js';

const configurePassport = () => {
    // ---------------------------------------------------------
    // GITHUB STRATEGY
    // ---------------------------------------------------------
    passport.use(new GitHubStrategy({
        clientID: process.env.GITHUB_CLIENT_ID || 'dummy',
        clientSecret: process.env.GITHUB_CLIENT_SECRET || 'dummy',
        callbackURL: `${process.env.BACKEND_URL || 'http://localhost:8080'}/api/auth/github/callback`,
        scope: ['user:email']
    }, async (accessToken, refreshToken, profile, done) => {
        try {
            const email = profile.emails?.[0]?.value;
            const userProfile = {
                email,
                name: profile.displayName || profile.username,
                picture: profile.photos?.[0]?.value || '/User.jpeg',
                provider: 'github',
                providerId: profile.id
            };
            return done(null, userProfile);
        } catch (err) {
            return done(err);
        }
    }));

    // ---------------------------------------------------------
    // FACEBOOK STRATEGY
    // ---------------------------------------------------------
    passport.use(new FacebookStrategy({
        clientID: process.env.FACEBOOK_APP_ID || 'dummy',
        clientSecret: process.env.FACEBOOK_APP_SECRET || 'dummy',
        callbackURL: `${process.env.BACKEND_URL || 'http://localhost:8080'}/api/auth/facebook/callback`,
        profileFields: ['id', 'displayName', 'photos', 'email']
    }, async (accessToken, refreshToken, profile, done) => {
        try {
            const userProfile = {
                email: profile.emails?.[0]?.value,
                name: profile.displayName,
                picture: profile.photos?.[0]?.value || '/User.jpeg',
                provider: 'facebook',
                providerId: profile.id
            };
            return done(null, userProfile);
        } catch (err) {
            return done(err);
        }
    }));

    // Add other strategies similarly...
};

export default configurePassport;
