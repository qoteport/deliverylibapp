import React from 'react';

interface DishIllustrationProps {
  type: 'jollof' | 'peppersoup' | 'palmbutter' | 'cassavaleaf' | 'suya' | 'snapper' | 'kala' | 'wonjo' | 'pasta' | 'steak' | 'burrata' | 'branzino' | 'risotto' | 'sourdough' | 'dessert' | 'cocktail';
  className?: string;
}

export const DishIllustration: React.FC<DishIllustrationProps> = ({ type, className = 'w-full h-full' }) => {
  switch (type) {
    case 'jollof':
      return (
        <div className={`relative overflow-hidden bg-[#241A14] flex items-center justify-center ${className}`}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(235,94,40,0.3),transparent_75%)]" />
          <svg viewBox="0 0 400 300" className="w-full h-full drop-shadow-xl" fill="none">
            {/* Ceramic Serving Bowl */}
            <ellipse cx="200" cy="155" rx="145" ry="105" fill="#2E251E" stroke="#4A3D33" strokeWidth="2.5" />
            <ellipse cx="200" cy="155" rx="125" ry="85" fill="#221A15" />

            {/* Steaming Liberian Jollof Rice (Rich seasoned orange-red) */}
            <ellipse cx="185" cy="155" rx="90" ry="60" fill="#D64515" />
            <ellipse cx="185" cy="155" rx="80" ry="50" fill="#E8592A" />

            {/* Rice Grain Stippling */}
            <g fill="#FFA17A" opacity="0.6">
              <ellipse cx="160" cy="140" rx="3.5" ry="1.5" transform="rotate(25 160 140)" />
              <ellipse cx="190" cy="145" rx="3.5" ry="1.5" transform="rotate(-30 190 145)" />
              <ellipse cx="210" cy="160" rx="3.5" ry="1.5" transform="rotate(45 210 160)" />
              <ellipse cx="150" cy="165" rx="3.5" ry="1.5" transform="rotate(-15 150 165)" />
              <ellipse cx="180" cy="175" rx="3.5" ry="1.5" transform="rotate(35 180 175)" />
            </g>

            {/* Golden Fried Sweet Plantains (Dodo) */}
            <ellipse cx="130" cy="180" rx="20" ry="10" fill="#E59824" stroke="#8C4E0A" strokeWidth="1.5" transform="rotate(-20 130 180)" />
            <ellipse cx="150" cy="190" rx="22" ry="11" fill="#E59824" stroke="#8C4E0A" strokeWidth="1.5" transform="rotate(-10 150 190)" />
            <ellipse cx="175" cy="195" rx="20" ry="10" fill="#C47814" stroke="#6E3B06" strokeWidth="1.5" />

            {/* Seasoned Crispy Grilled Chicken Drumstick */}
            <g transform="translate(200, 105)">
              <ellipse cx="40" cy="35" rx="34" ry="22" fill="#783416" stroke="#451A07" strokeWidth="2" transform="rotate(25 40 35)" />
              <ellipse cx="38" cy="32" rx="28" ry="16" fill="#9E461B" transform="rotate(25 38 32)" />
              {/* Bone end */}
              <rect x="75" y="45" width="16" height="8" rx="3" fill="#EDE4D8" transform="rotate(25 75 45)" />
            </g>

            {/* Spicy Scotch Bonnet Pepper slice & Parsley */}
            <circle cx="170" cy="130" r="7" fill="#E61C1C" stroke="#800A0A" strokeWidth="1" />
            <circle cx="170" cy="130" r="3" fill="#FF8080" />
            <path d="M195 125 C 190 115, 205 115, 202 125 Z" fill="#2E7D32" />
          </svg>
        </div>
      );

    case 'peppersoup':
      return (
        <div className={`relative overflow-hidden bg-[#1E1715] flex items-center justify-center ${className}`}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(217,54,30,0.25),transparent_75%)]" />
          <svg viewBox="0 0 400 300" className="w-full h-full drop-shadow-xl" fill="none">
            {/* Clay Soup Bowl */}
            <circle cx="200" cy="150" r="115" fill="#382218" stroke="#543425" strokeWidth="2.5" />
            <circle cx="200" cy="150" r="90" fill="#22120B" />

            {/* Fiery Pepper Soup Broth */}
            <circle cx="200" cy="150" r="75" fill="#B32D15" />
            <circle cx="200" cy="150" r="65" fill="#C93B20" opacity="0.9" />

            {/* Fresh Fish Steaks / Meat cuts in soup */}
            <ellipse cx="180" cy="140" rx="25" ry="16" fill="#803D27" stroke="#4D2012" strokeWidth="1.5" />
            <ellipse cx="225" cy="155" rx="22" ry="15" fill="#803D27" stroke="#4D2012" strokeWidth="1.5" />

            {/* Boiled Cassava Piece */}
            <rect x="155" y="160" width="28" height="18" rx="4" fill="#E8DEC8" stroke="#B3A58B" strokeWidth="1.5" transform="rotate(15 155 160)" />

            {/* Floating Habanero / Scotch Bonnet Peppers */}
            <circle cx="170" cy="120" r="8" fill="#F03A16" />
            <circle cx="215" cy="125" r="7" fill="#E87C17" />

            {/* Pepper soup herbs & spices */}
            <circle cx="195" cy="145" r="2.5" fill="#1C4518" />
            <circle cx="160" cy="145" r="2" fill="#1C4518" />
            <circle cx="220" cy="170" r="2.5" fill="#1C4518" />

            {/* Steam trails */}
            <path d="M190 90 Q 185 70 195 50" stroke="#FFF" strokeWidth="2" strokeLinecap="round" opacity="0.3" fill="none" />
            <path d="M210 95 Q 215 75 205 55" stroke="#FFF" strokeWidth="2" strokeLinecap="round" opacity="0.3" fill="none" />
          </svg>
        </div>
      );

    case 'palmbutter':
      return (
        <div className={`relative overflow-hidden bg-[#26150E] flex items-center justify-center ${className}`}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(217,97,30,0.3),transparent_75%)]" />
          <svg viewBox="0 0 400 300" className="w-full h-full drop-shadow-xl" fill="none">
            {/* Deep Pottery Bowl */}
            <circle cx="200" cy="150" r="115" fill="#3D1D12" stroke="#572B1B" strokeWidth="2.5" />
            <circle cx="200" cy="150" r="92" fill="#240D05" />

            {/* Rich Golden-Orange Palm Nut Cream Gravy */}
            <circle cx="200" cy="150" r="78" fill="#D95511" />
            <circle cx="200" cy="150" r="68" fill="#F06E1A" />

            {/* Smoked Fish & Country Meat cuts */}
            <ellipse cx="175" cy="140" rx="26" ry="18" fill="#522413" stroke="#2B1006" strokeWidth="2" />
            <ellipse cx="220" cy="160" rx="24" ry="16" fill="#6B331D" stroke="#3D1A0C" strokeWidth="2" />

            {/* Crab Claw Accents */}
            <path d="M150 170 Q 140 185 155 190 Q 165 180 150 170 Z" fill="#B83918" />

            {/* Palm oil sheen reflections */}
            <ellipse cx="190" cy="132" rx="15" ry="6" fill="#FF9C59" opacity="0.5" />
          </svg>
        </div>
      );

    case 'cassavaleaf':
      return (
        <div className={`relative overflow-hidden bg-[#162115] flex items-center justify-center ${className}`}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(46,125,50,0.25),transparent_75%)]" />
          <svg viewBox="0 0 400 300" className="w-full h-full drop-shadow-xl" fill="none">
            <ellipse cx="200" cy="155" rx="145" ry="105" fill="#242E21" stroke="#384734" strokeWidth="2.5" />
            <ellipse cx="200" cy="155" rx="125" ry="85" fill="#182116" />

            {/* Simmered Savory Deep Green Cassava Leaves */}
            <ellipse cx="190" cy="155" rx="85" ry="58" fill="#25421E" />
            <ellipse cx="190" cy="155" rx="75" ry="48" fill="#305727" />

            {/* Red Palm Oil droplet streaks on greens */}
            <path d="M165 145 Q 180 155 175 165" stroke="#E65100" strokeWidth="3" strokeLinecap="round" />
            <path d="M205 138 Q 220 148 215 158" stroke="#E65100" strokeWidth="3" strokeLinecap="round" />

            {/* Tender Braised Meat & Smoked Fish pieces */}
            <rect x="175" y="145" width="26" height="18" rx="4" fill="#4E2B1A" stroke="#2B140A" strokeWidth="1.5" />
            <rect x="210" y="160" width="22" height="16" rx="4" fill="#5E3823" stroke="#2B140A" strokeWidth="1.5" />

            {/* Steamed White Country Rice Mound Side */}
            <ellipse cx="130" cy="165" rx="35" ry="24" fill="#F5F3EC" stroke="#DDD7C8" strokeWidth="1.5" />
          </svg>
        </div>
      );

    case 'suya':
      return (
        <div className={`relative overflow-hidden bg-[#241712] flex items-center justify-center ${className}`}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(217,83,30,0.3),transparent_75%)]" />
          <svg viewBox="0 0 400 300" className="w-full h-full drop-shadow-xl" fill="none">
            {/* Wooden Skewer Board */}
            <rect x="50" y="55" width="300" height="190" rx="12" fill="#362218" stroke="#543627" strokeWidth="2" />
            <rect x="58" y="63" width="284" height="174" rx="8" fill="#2B1A12" />

            {/* Skewer 1 */}
            <line x1="80" y1="120" x2="320" y2="120" stroke="#C49B74" strokeWidth="3" strokeLinecap="round" />
            {/* Beef Chunks with spicy peanut suya rub */}
            <rect x="110" y="105" width="35" height="30" rx="5" fill="#6B2912" stroke="#B84A1A" strokeWidth="2" />
            <rect x="155" y="105" width="38" height="30" rx="5" fill="#5C210C" stroke="#B84A1A" strokeWidth="2" />
            <rect x="202" y="105" width="36" height="30" rx="5" fill="#6B2912" stroke="#B84A1A" strokeWidth="2" />
            <rect x="248" y="105" width="35" height="30" rx="5" fill="#5C210C" stroke="#B84A1A" strokeWidth="2" />

            {/* Skewer 2 */}
            <line x1="80" y1="175" x2="320" y2="175" stroke="#C49B74" strokeWidth="3" strokeLinecap="round" />
            <rect x="115" y="160" width="36" height="30" rx="5" fill="#5C210C" stroke="#B84A1A" strokeWidth="2" />
            <rect x="160" y="160" width="38" height="30" rx="5" fill="#6B2912" stroke="#B84A1A" strokeWidth="2" />
            <rect x="208" y="160" width="35" height="30" rx="5" fill="#5C210C" stroke="#B84A1A" strokeWidth="2" />
            <rect x="252" y="160" width="36" height="30" rx="5" fill="#6B2912" stroke="#B84A1A" strokeWidth="2" />

            {/* Sliced Purple Red Onions */}
            <circle cx="130" cy="205" r="14" fill="#801C48" stroke="#D1568A" strokeWidth="1.5" />
            <circle cx="130" cy="205" r="8" fill="#2B1A12" />
            <circle cx="165" cy="208" r="13" fill="#801C48" stroke="#D1568A" strokeWidth="1.5" />
            <circle cx="165" cy="208" r="7" fill="#2B1A12" />

            {/* Suya Yaji spice dust stippling */}
            <circle cx="125" cy="115" r="1.5" fill="#E88235" />
            <circle cx="170" cy="122" r="1.5" fill="#E88235" />
            <circle cx="220" cy="118" r="1.5" fill="#E88235" />
            <circle cx="135" cy="170" r="1.5" fill="#E88235" />
            <circle cx="180" cy="175" r="1.5" fill="#E88235" />
          </svg>
        </div>
      );

    case 'snapper':
      return (
        <div className={`relative overflow-hidden bg-[#1C2024] flex items-center justify-center ${className}`}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(217,97,48,0.25),transparent_75%)]" />
          <svg viewBox="0 0 400 300" className="w-full h-full drop-shadow-xl" fill="none">
            {/* Oval Platter */}
            <ellipse cx="200" cy="150" rx="155" ry="95" fill="#293036" stroke="#414C54" strokeWidth="2" />
            <ellipse cx="200" cy="150" rx="140" ry="80" fill="#1F2429" />

            {/* Whole Crispy Fried Snapper */}
            <path d="M100 150 C 130 120, 230 115, 275 145 C 285 138, 295 130, 305 125 C 300 145, 300 155, 305 175 C 295 170, 285 162, 275 155 C 230 185, 130 180, 100 150 Z" fill="#994D26" stroke="#5E2A10" strokeWidth="2" />

            {/* Crispy Scoring Marks */}
            <line x1="160" y1="130" x2="175" y2="170" stroke="#421C0A" strokeWidth="3" strokeLinecap="round" />
            <line x1="190" y1="128" x2="205" y2="172" stroke="#421C0A" strokeWidth="3" strokeLinecap="round" />
            <line x1="220" y1="130" x2="235" y2="170" stroke="#421C0A" strokeWidth="3" strokeLinecap="round" />

            {/* Liberian Raw Pepper Sauce Gravy over fish */}
            <path d="M150 145 Q 185 135 220 150 Q 185 160 150 145 Z" fill="#D6301A" opacity="0.9" />

            {/* Sliced Lime & Plantains */}
            <circle cx="130" cy="180" r="13" fill="#6EA822" stroke="#A6E64E" strokeWidth="1.5" />
            <circle cx="130" cy="180" r="9" fill="#588C14" />
          </svg>
        </div>
      );

    case 'kala':
      return (
        <div className={`relative overflow-hidden bg-[#241A14] flex items-center justify-center ${className}`}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(235,148,40,0.3),transparent_75%)]" />
          <svg viewBox="0 0 400 300" className="w-full h-full drop-shadow-xl" fill="none">
            <ellipse cx="200" cy="155" rx="140" ry="95" fill="#38281E" stroke="#543E30" strokeWidth="2" />
            <ellipse cx="200" cy="155" rx="125" ry="80" fill="#261A12" />

            {/* Golden Fried Kala Balls */}
            <circle cx="150" cy="140" r="28" fill="#D98A1E" stroke="#8C5208" strokeWidth="2" />
            <circle cx="150" cy="138" r="24" fill="#F0A632" />

            <circle cx="210" cy="135" r="30" fill="#D98A1E" stroke="#8C5208" strokeWidth="2" />
            <circle cx="210" cy="133" r="26" fill="#F0A632" />

            <circle cx="180" cy="175" r="26" fill="#C47814" stroke="#7A4304" strokeWidth="2" />
            <circle cx="180" cy="173" r="22" fill="#E59422" />

            {/* Small Dip Cup of Fiery Red Pepper Sauce */}
            <circle cx="255" cy="175" r="22" fill="#EDE4D8" stroke="#B8AA98" strokeWidth="1.5" />
            <circle cx="255" cy="175" r="17" fill="#C92A14" />
            <circle cx="253" cy="173" r="4" fill="#FF5C42" opacity="0.6" />
          </svg>
        </div>
      );

    case 'wonjo':
      return (
        <div className={`relative overflow-hidden bg-[#1E1217] flex items-center justify-center ${className}`}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(176,18,62,0.3),transparent_75%)]" />
          <svg viewBox="0 0 400 300" className="w-full h-full drop-shadow-xl" fill="none">
            {/* Coaster */}
            <circle cx="200" cy="225" r="55" fill="#2E1C24" stroke="#472E39" strokeWidth="1.5" />

            {/* Tall Glass */}
            <path d="M165 75 L 172 215 C 172 225, 228 225, 228 215 L 235 75 Z" fill="#291620" stroke="#7A4A61" strokeWidth="2" opacity="0.7" />

            {/* Deep Ruby Hibiscus Wonjo Juice */}
            <path d="M168 95 L 173 212 C 173 222, 227 222, 227 212 L 232 95 Z" fill="#960F33" />

            {/* Floating Ice Cubes */}
            <rect x="180" y="105" width="22" height="22" rx="3" fill="#FFF" fillOpacity="0.4" stroke="#FFF" strokeWidth="0.8" transform="rotate(15 180 105)" />
            <rect x="195" y="135" width="20" height="20" rx="3" fill="#FFF" fillOpacity="0.4" stroke="#FFF" strokeWidth="0.8" transform="rotate(-10 195 135)" />

            {/* Fresh Lime Wheel on Rim */}
            <ellipse cx="235" cy="80" rx="16" ry="12" fill="#7DB82A" stroke="#B4F255" strokeWidth="1.5" transform="rotate(-25 235 80)" />
            <ellipse cx="235" cy="80" rx="11" ry="8" fill="#99D93D" transform="rotate(-25 235 80)" />

            {/* Mint Sprig */}
            <path d="M175 75 C 165 60, 185 55, 182 72 Z" fill="#3D9428" />
          </svg>
        </div>
      );

    case 'pasta':
      return (
        <div className={`relative overflow-hidden bg-[#241F1A] flex items-center justify-center ${className}`}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(217,143,77,0.25),transparent_70%)]" />
          <svg viewBox="0 0 400 300" className="w-full h-full drop-shadow-xl" fill="none">
            <ellipse cx="200" cy="155" rx="145" ry="105" fill="#2B2621" stroke="#4A443E" strokeWidth="2" />
            <ellipse cx="200" cy="155" rx="115" ry="80" fill="#201C18" />
            <ellipse cx="200" cy="155" rx="75" ry="50" fill="#E8BD65" fillOpacity="0.25" />
            <g stroke="#E5B869" strokeWidth="5.5" strokeLinecap="round" fill="none">
              <path d="M140 160 C 150 120, 240 120, 255 160 C 265 190, 160 200, 150 170" />
              <path d="M155 150 C 170 125, 235 125, 240 150 C 245 175, 170 185, 160 165" />
            </g>
            <circle cx="175" cy="138" r="2" fill="#FFF8E7" />
            <circle cx="215" cy="134" r="1.8" fill="#FFF8E7" />
          </svg>
        </div>
      );

    case 'steak':
      return (
        <div className={`relative overflow-hidden bg-[#1E1916] flex items-center justify-center ${className}`}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(204,85,41,0.25),transparent_75%)]" />
          <svg viewBox="0 0 400 300" className="w-full h-full drop-shadow-xl" fill="none">
            <rect x="50" y="55" width="300" height="190" rx="12" fill="#1C1B1A" stroke="#33302D" strokeWidth="2" />
            <ellipse cx="180" cy="145" rx="45" ry="32" fill="#4A2618" />
            <ellipse cx="178" cy="143" rx="35" ry="24" fill="#C4483D" />
            <ellipse cx="190" cy="135" rx="12" ry="7" fill="#F5CB5C" />
            <circle cx="255" cy="155" r="12" fill="#B83226" />
          </svg>
        </div>
      );

    case 'burrata':
      return (
        <div className={`relative overflow-hidden bg-[#22201D] flex items-center justify-center ${className}`}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(94,140,74,0.2),transparent_75%)]" />
          <svg viewBox="0 0 400 300" className="w-full h-full drop-shadow-xl" fill="none">
            <ellipse cx="200" cy="155" rx="140" ry="100" fill="#D8CDC1" stroke="#BAABA0" strokeWidth="2" />
            <ellipse cx="200" cy="155" rx="120" ry="82" fill="#F2EBE3" />
            <ellipse cx="200" cy="150" rx="45" ry="35" fill="#FFFFFF" stroke="#DDD5C8" strokeWidth="1" />
            <circle cx="150" cy="155" r="16" fill="#D43D2A" />
            <circle cx="245" cy="150" r="15" fill="#E89B2B" />
          </svg>
        </div>
      );

    case 'branzino':
      return (
        <div className={`relative overflow-hidden bg-[#1A1E21] flex items-center justify-center ${className}`}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(92,152,173,0.2),transparent_75%)]" />
          <svg viewBox="0 0 400 300" className="w-full h-full drop-shadow-xl" fill="none">
            <ellipse cx="200" cy="150" rx="150" ry="90" fill="#262D30" stroke="#414D52" strokeWidth="2" />
            <path d="M110 150 C 135 125, 230 120, 275 145 C 285 140, 295 135, 300 132 C 298 145, 298 155, 300 168 C 295 165, 285 160, 275 155 C 230 180, 135 175, 110 150 Z" fill="#7E96A0" />
            <circle cx="160" cy="148" r="12" fill="#F2D138" />
          </svg>
        </div>
      );

    case 'dessert':
      return (
        <div className={`relative overflow-hidden bg-[#1E1715] flex items-center justify-center ${className}`}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(196,110,61,0.22),transparent_75%)]" />
          <svg viewBox="0 0 400 300" className="w-full h-full drop-shadow-xl" fill="none">
            <circle cx="200" cy="150" r="110" fill="#241E1C" stroke="#3D322E" strokeWidth="2" />
            <ellipse cx="185" cy="145" rx="36" ry="28" fill="#211009" stroke="#3D1D10" strokeWidth="2" />
            <ellipse cx="230" cy="138" rx="18" ry="13" fill="#FFF9EB" stroke="#E6DAC3" strokeWidth="1" />
            <circle cx="152" cy="162" r="8" fill="#B81D3C" />
          </svg>
        </div>
      );

    case 'cocktail':
      return (
        <div className={`relative overflow-hidden bg-[#1B191E] flex items-center justify-center ${className}`}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(217,97,48,0.25),transparent_75%)]" />
          <svg viewBox="0 0 400 300" className="w-full h-full drop-shadow-xl" fill="none">
            <circle cx="200" cy="220" r="50" fill="#262329" stroke="#3D3742" strokeWidth="1.5" />
            <path d="M150 125 C 150 165, 250 165, 250 125 Z" fill="#C43B18" stroke="#8A8096" strokeWidth="2" />
            <rect x="188" y="118" width="24" height="24" rx="3" fill="#FFF" fillOpacity="0.4" />
          </svg>
        </div>
      );

    default:
      return (
        <div className={`bg-[#201C18] flex items-center justify-center text-white/50 ${className}`}>
          <span>Food Specialty</span>
        </div>
      );
  }
};
