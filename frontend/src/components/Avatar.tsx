interface AvatarProps {
    profile: {
        first_name: string;
        last_name: string;
    };
}

function Avatar({ profile }: AvatarProps) {
    const getInitials = () => {
        return `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase();
    };

    // Use a consistent blue color instead of random colors
    const avatarColor = '#2196f3'; // Material Design Blue

    return (
        <div className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-2xl"
            style={{ backgroundColor: avatarColor }}
        >
            <span>{getInitials()}</span>
        </div>
    );
}

export default Avatar;