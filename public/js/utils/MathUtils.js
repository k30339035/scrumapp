/**
 * 수학 유틸리티 함수
 */

export class MathUtils {
    /**
     * 선형 보간
     */
    static lerp(start, end, t) {
        return start + (end - start) * t;
    }

    /**
     * 값을 범위로 제한
     */
    static clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    /**
     * 값을 다른 범위로 매핑
     */
    static map(value, inMin, inMax, outMin, outMax) {
        return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
    }

    /**
     * 랜덤 범위
     */
    static randomRange(min, max) {
        return Math.random() * (max - min) + min;
    }

    /**
     * 랜덤 정수 범위
     */
    static randomInt(min, max) {
        return Math.floor(this.randomRange(min, max + 1));
    }

    /**
     * 랜덤 선택
     */
    static randomChoice(array) {
        return array[Math.floor(Math.random() * array.length)];
    }

    /**
     * 가중치 랜덤 선택
     */
    static weightedRandom(weights) {
        const total = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
        let random = Math.random() * total;

        for (const [key, weight] of Object.entries(weights)) {
            random -= weight;
            if (random <= 0) return key;
        }

        return Object.keys(weights)[0];
    }

    /**
     * 2D 거리
     */
    static distance2D(x1, z1, x2, z2) {
        const dx = x2 - x1;
        const dz = z2 - z1;
        return Math.sqrt(dx * dx + dz * dz);
    }

    /**
     * 3D 거리
     */
    static distance3D(x1, y1, z1, x2, y2, z2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const dz = z2 - z1;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    /**
     * 각도를 라디안으로
     */
    static degToRad(degrees) {
        return degrees * (Math.PI / 180);
    }

    /**
     * 라디안을 각도로
     */
    static radToDeg(radians) {
        return radians * (180 / Math.PI);
    }

    /**
     * 부드러운 감속
     */
    static smoothDamp(current, target, velocity, smoothTime, deltaTime) {
        smoothTime = Math.max(0.0001, smoothTime);
        const omega = 2 / smoothTime;
        const x = omega * deltaTime;
        const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);

        let change = current - target;
        const originalTo = target;
        const maxChange = Infinity;

        change = this.clamp(change, -maxChange, maxChange);
        target = current - change;

        const temp = (velocity + omega * change) * deltaTime;
        velocity = (velocity - omega * temp) * exp;
        let output = target + (change + temp) * exp;

        if (originalTo - current > 0 === output > originalTo) {
            output = originalTo;
            velocity = (output - originalTo) / deltaTime;
        }

        return { value: output, velocity };
    }

    /**
     * Ease In Out
     */
    static easeInOutQuad(t) {
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    }

    /**
     * Ease Out Cubic
     */
    static easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    /**
     * 벡터 정규화
     */
    static normalize(x, y, z) {
        const length = Math.sqrt(x * x + y * y + z * z);
        if (length === 0) return { x: 0, y: 0, z: 0 };
        return {
            x: x / length,
            y: y / length,
            z: z / length,
        };
    }

    /**
     * 각도 차이 계산 (-180 ~ 180)
     */
    static angleDifference(a, b) {
        let diff = b - a;
        while (diff > 180) diff -= 360;
        while (diff < -180) diff += 360;
        return diff;
    }

    /**
     * 확률 체크
     */
    static chance(probability) {
        return Math.random() < probability;
    }

    /**
     * 배열 섞기 (Fisher-Yates)
     */
    static shuffle(array) {
        const newArray = [...array];
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
    }

    /**
     * 원 위의 점
     */
    static pointOnCircle(centerX, centerZ, radius, angle) {
        return {
            x: centerX + radius * Math.cos(angle),
            z: centerZ + radius * Math.sin(angle),
        };
    }

    /**
     * 구 위의 랜덤 점
     */
    static randomPointOnSphere(radius) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);

        return {
            x: radius * Math.sin(phi) * Math.cos(theta),
            y: radius * Math.sin(phi) * Math.sin(theta),
            z: radius * Math.cos(phi),
        };
    }
}
